import { adminReady, hasAdminSession } from '../../../../lib/server/adminSession';
import { apiResponse } from '../../../../lib/server/adminHttp';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  return apiResponse({
    configured: adminReady(),
    authenticated: adminReady() && hasAdminSession(request)
  });
}
