import { NextResponse } from 'next/server';
import { adminReady, hasAdminSession, sameOrigin } from './adminSession';

export function apiResponse(value, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}

export function authorizeMutation(request) {
  if (!adminReady()) return apiResponse({ error: '관리자 서버 설정이 아직 완료되지 않았습니다.' }, 503);
  if (!sameOrigin(request)) return apiResponse({ error: '허용되지 않은 요청입니다.' }, 403);
  if (!hasAdminSession(request)) return apiResponse({ error: '관리자 비밀번호를 다시 입력해주세요.' }, 401);
  return null;
}

export async function readJson(request, maxBytes = 45_000) {
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > maxBytes) throw new Error('요청 내용이 너무 큽니다.');
  const raw = await request.text();
  if (raw.length > maxBytes) throw new Error('요청 내용이 너무 큽니다.');
  return JSON.parse(raw);
}

export function badRequest(error) {
  return apiResponse({ error: error?.message || '요청을 처리하지 못했습니다.' }, 400);
}
