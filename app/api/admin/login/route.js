import { createHmac } from 'node:crypto';
import { adminReady, issueAdminCookie, sameOrigin, validPassword } from '../../../../lib/server/adminSession';
import { adminDatabase } from '../../../../lib/server/adminData';
import { apiResponse, readJson } from '../../../../lib/server/adminHttp';

export const runtime = 'nodejs';
const LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

function fingerprint(request) {
  const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') || 'unknown';
  return createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(address).digest('hex');
}

async function recentFailures(client, key) {
  const { data, error } = await client.from('admin_login_attempts')
    .select('failed_count,updated_at').eq('fingerprint', key).maybeSingle();
  if (error) throw new Error('로그인 제한 설정을 확인해주세요.');
  if (!data || Date.now() - new Date(data.updated_at).getTime() > LIMIT_WINDOW_MS) return 0;
  return data.failed_count;
}

export async function POST(request) {
  if (!adminReady()) return apiResponse({ error: '관리자 비밀번호와 서버 키 설정이 필요합니다.' }, 503);
  if (!sameOrigin(request)) return apiResponse({ error: '허용되지 않은 요청입니다.' }, 403);
  try {
    const client = adminDatabase();
    const key = fingerprint(request);
    const fails = await recentFailures(client, key);
    if (fails >= MAX_FAILURES) return apiResponse({ error: '비밀번호 입력 횟수를 초과했습니다. 15분 뒤 다시 시도해주세요.' }, 429);
    const body = await readJson(request, 1200);
    if (!validPassword(body?.password)) {
      const { error } = await client.from('admin_login_attempts')
        .upsert({ fingerprint: key, failed_count: fails + 1, updated_at: new Date().toISOString() });
      if (error) throw new Error('로그인 제한 설정을 확인해주세요.');
      return apiResponse({ error: '비밀번호가 올바르지 않습니다.' }, 401);
    }
    const { error } = await client.from('admin_login_attempts').delete().eq('fingerprint', key);
    if (error) throw new Error('로그인 제한 설정을 확인해주세요.');
    return issueAdminCookie(apiResponse({ authenticated: true }));
  } catch (error) {
    return apiResponse({ error: error instanceof SyntaxError ? '잘못된 요청입니다.' : error?.message || '로그인 오류가 발생했습니다.' }, 400);
  }
}
