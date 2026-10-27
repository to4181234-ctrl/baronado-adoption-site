import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { adminDatabase, validId } from './adminData.js';
import { sameOrigin } from './adminSession.js';

const scrypt = promisify(scryptCallback);
const COOKIE = 'baronado_go';
const SESSION_SECONDS = 7 * 86400;

export function goError(message, status = 400) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function goMutationAllowed(request) {
  return sameOrigin(request) ? null : goError('같은 사이트에서 다시 시도해주세요.', 403);
}

export function nicknameKey(value) {
  const nickname = typeof value === 'string' ? value.trim().normalize('NFC') : '';
  if (!/^[\p{L}\p{N}_]{2,14}$/u.test(nickname)) throw new Error('닉네임은 2~14자의 글자, 숫자, _만 사용할 수 있어요.');
  return { nickname, key: nickname.toLocaleLowerCase('ko-KR') };
}

export function passwordCheck(value) {
  if (typeof value !== 'string' || value.length < 10 || value.length > 128) throw new Error('비밀번호는 10~128자로 입력해주세요.');
  return value;
}

export async function hashSecret(secret) {
  const salt = randomBytes(16).toString('base64url');
  const hash = await scrypt(secret, salt, 64);
  return `${salt}.${hash.toString('base64url')}`;
}

export async function verifySecret(secret, stored) {
  if (typeof secret !== 'string' || typeof stored !== 'string' || secret.length > 128) return false;
  const [salt, value] = stored.split('.');
  if (!salt || !value) return false;
  const expected = Buffer.from(value, 'base64url');
  if (expected.length !== 64) return false;
  const actual = await scrypt(secret, salt, 64);
  return timingSafeEqual(actual, expected);
}

function signingKey() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('로그인 설정이 완료되지 않았어요.');
  return createHmac('sha256', secret).update('baronado-go-session-v1').digest();
}

function sign(value) {
  return createHmac('sha256', signingKey()).update(value).digest('base64url');
}

export function issueGoCookie(response, id) {
  const payload = `v1.${id}.${Math.floor(Date.now() / 1000) + SESSION_SECONDS}.${randomBytes(12).toString('base64url')}`;
  response.cookies.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: SESSION_SECONDS
  });
  return response;
}

export function clearGoCookie(response) {
  response.cookies.set(COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}

export async function goMember(request) {
  try {
    const parts = (request.cookies.get(COOKIE)?.value || '').split('.');
    if (parts.length !== 5 || parts[0] !== 'v1' || !validId(parts[1])) return null;
    const exp = Number(parts[2]);
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isSafeInteger(exp) || exp <= now || exp > now + SESSION_SECONDS) return null;
    const payload = parts.slice(0, 4).join('.');
    const expected = Buffer.from(sign(payload), 'base64url');
    const actual = Buffer.from(parts[4], 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const { data } = await adminDatabase().from('go_members').select('id,nickname,disabled').eq('id', parts[1]).maybeSingle();
    return data && !data.disabled ? data : null;
  } catch { return null; }
}

export async function authRateLimited(request) {
  const rawIp = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim().slice(0, 64);
  const key = createHmac('sha256', signingKey()).update(rawIp).digest('hex');
  const db = adminDatabase();
  const from = new Date(Date.now() - 15 * 60000).toISOString();
  const { count, error } = await db.from('go_auth_attempts').select('*', { count: 'exact', head: true }).eq('ip_hash', key).gte('created_at', from);
  if (error) throw error;
  if (count >= 12) return true;
  const result = await db.from('go_auth_attempts').insert({ ip_hash: key });
  if (result.error) throw result.error;
  return false;
}
