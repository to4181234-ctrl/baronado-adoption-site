import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'baronado_admin';
const SESSION_SECONDS = 8 * 60 * 60;

function digest(input) {
  return createHash('sha256').update(input).digest();
}

function sessionKey() {
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  const password = process.env.ADMIN_PASSWORD || '';
  return createHmac('sha256', secret).update(password).digest();
}

function signature(message) {
  return createHmac('sha256', sessionKey()).update(message).digest('base64url');
}

export function adminReady() {
  return Boolean(
    process.env.ADMIN_PASSWORD?.length >= 12 &&
    process.env.ADMIN_SESSION_SECRET?.length >= 32 &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
}

export function validPassword(candidate) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!adminReady() || typeof candidate !== 'string' || candidate.length > 256) return false;
  const actual = digest(candidate);
  const correct = digest(expected);
  return timingSafeEqual(actual, correct);
}

export function issueAdminCookie(response) {
  const expiration = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = ['v1', expiration, randomBytes(16).toString('base64url')].join('.');
  response.cookies.set(ADMIN_COOKIE, payload + '.' + signature(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/admin',
    maxAge: SESSION_SECONDS
  });
  return response;
}

export function clearAdminCookie(response) {
  response.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/admin',
    maxAge: 0
  });
  return response;
}

export function hasAdminSession(request) {
  if (!adminReady()) return false;
  const token = request.cookies.get(ADMIN_COOKIE)?.value || '';
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return false;
  const expiration = Number(parts[1]);
  if (!Number.isSafeInteger(expiration) || expiration <= Math.floor(Date.now() / 1000)) return false;
  if (expiration > Math.floor(Date.now() / 1000) + SESSION_SECONDS) return false;
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(parts[2])) return false;
  const payload = parts.slice(0, 3).join('.');
  const a = Buffer.from(parts[3], 'base64url');
  const b = Buffer.from(signature(payload), 'base64url');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
