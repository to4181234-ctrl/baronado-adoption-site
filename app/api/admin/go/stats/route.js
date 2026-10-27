import { hasAdminSession } from '../../../../../lib/server/adminSession.js';
import { adminDatabase } from '../../../../../lib/server/adminData.js';
import { monthDate } from '../../../../../lib/goShared.js';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  if (!hasAdminSession(request)) return Response.json({ error: '관리자 로그인이 필요해요.' }, { status: 401 });
  try {
    const month = new URL(request.url).searchParams.get('month');
    const { data, error } = await adminDatabase().rpc('go_post_stats', { p_month: month ? monthDate(month) : null });
    if (error) throw error;
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: '통계를 불러오지 못했어요.' }, { status: 500 }); }
}
