import {clearGoCookie} from '../../../../lib/server/goAuth.js';
import { adminAuthMode, clearAdminCookie, sameOrigin } from '../../../../lib/server/adminSession';
import { apiResponse } from '../../../../lib/server/adminHttp';

export async function POST(request) {
  if (!sameOrigin(request)) return apiResponse({ error: '허용되지 않은 요청입니다.' }, 403);
  const response=clearAdminCookie(apiResponse({ authenticated: false }));
  return adminAuthMode()==='member'?clearGoCookie(response):response;
}
