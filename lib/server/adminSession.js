import { adminMemberIds, isAllowedAdminMember } from '../adminAccessPolicy.js';
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

// `shared_link` is an explicit opt-in: no login, no password and no session.
// This means anyone who reaches the admin URL/API can manage the site.
// Keep `member` the default to avoid exposing a production site by mistake.
export function adminAuthMode(){return process.env.ADMIN_AUTH_MODE || 'member';}

/** Legacy-only: no extra password prompt in LOCAL or explicitly protected preview testing only.
 * Never enable on a publicly reachable production origin: anyone can mutate data. */
export function adminPasswordlessPreview() {
  return adminAuthMode()==='password' && (process.env.NODE_ENV === 'development' || (
    process.env.ADMIN_PASSWORDLESS_PREVIEW === '1' && process.env.VERCEL_ENV === 'preview'
  ));
}
export function adminReady() {
  return Boolean(
    (adminAuthMode()==='shared_link' ||
      (adminAuthMode()==='member' && adminMemberIds(process.env.ADMIN_MEMBER_IDS).length>0) ||
      (adminAuthMode()==='password' && (adminPasswordlessPreview() || process.env.ADMIN_PASSWORD?.length >= 4))) &&
    (adminAuthMode()==='shared_link' || process.env.ADMIN_SESSION_SECRET?.length >= 32) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
}

export function validPassword(candidate) {
  const expected = process.env.ADMIN_PASSWORD;
  if (adminAuthMode()!=='password' || !adminReady() || typeof expected!=='string' || typeof candidate !== 'string' || candidate.length > 256) return false;
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

function hasPasswordAdminSession(request) {
  if (!adminReady()) return false;
  if (adminPasswordlessPreview()) return true;
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

// Recheck the current member row and session version on every privileged request.
// Import lazily: goAuth also uses sameOrigin from this module.
export async function adminAccess(request) {
 const mode=adminAuthMode();
 if(!adminReady())return {mode,authenticated:false,signedIn:false};
 // A shared link is not authentication. Treat all visitors as administrators
 // only when the server has explicitly opted in to this mode.
 if(mode==='shared_link')return {mode,authenticated:true,signedIn:false};
 if(mode==='member'){
  try{
   const {goMember}=await import('./goAuth.js');
   const member=await goMember(request);
   return {mode,authenticated:isAllowedAdminMember(member,adminMemberIds(process.env.ADMIN_MEMBER_IDS)),signedIn:Boolean(member)};
  }catch{return {mode,authenticated:false,signedIn:false};}
 }
 const authenticated=hasPasswordAdminSession(request);
 return {mode,authenticated,signedIn:authenticated};
}
export async function hasAdminSession(request){return (await adminAccess(request)).authenticated;}

export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
