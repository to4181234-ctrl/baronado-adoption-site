import { clearAdminCookie, sameOrigin } from '../../../../lib/server/adminSession';
import { apiResponse } from '../../../../lib/server/adminHttp';

export async function POST(request) {
  if (!sameOrigin(request)) return apiResponse({ error: '허용되지 않은 요청입니다.' }, 403);
  return clearAdminCookie(apiResponse({ authenticated: false }));
}
