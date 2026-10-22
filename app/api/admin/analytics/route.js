import { adminDatabase } from '../../../../lib/server/adminData';
import { adminReady, hasAdminSession } from '../../../../lib/server/adminSession';
import { apiResponse } from '../../../../lib/server/adminHttp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function kstToday() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return [values.year, values.month, values.day].join('-');
}

export async function GET(request) {
  if (!adminReady()) return apiResponse({ error: '관리자 설정을 확인해주세요.' }, 503);
  if (!hasAdminSession(request)) return apiResponse({ error: '관리자 로그인이 필요합니다.' }, 401);

  const period = new URL(request.url).searchParams.get('period') || '7d';
  if (!['today', '7d', '30d', 'all'].includes(period)) {
    return apiResponse({ error: '기간을 확인해주세요.' }, 400);
  }

  const today = kstToday();
  const midnightKst = Date.parse(today + 'T00:00:00+09:00');
  const daysBack = period === 'today' ? 0 : period === '7d' ? 6 : 29;
  const start = period === 'all'
    ? null : new Date(midnightKst - daysBack * 86400000).toISOString();

  try {
    const admin = adminDatabase();
    const [summary, status] = await Promise.all([
      admin.rpc('admin_site_analytics', { p_start: start }),
      admin.from('dogs').select('id, adopted')
    ]);
    if (summary.error) throw summary.error;
    if (status.error) throw status.error;

    // Keep the recorded views/shares for every dog in the "All" category,
    // but let the dashboard hide adopted dogs when "Looking for family" is selected.
    const adoptedById = new Map((status.data || []).map(dog => [dog.id, Boolean(dog.adopted)]));
    const data = {
      ...summary.data,
      dogs: (summary.data?.dogs || []).map(dog => ({
        ...dog,
        adopted: adoptedById.get(dog.id) ?? false
      }))
    };
    return apiResponse({ period, today, startedAt: start, data });
  } catch (error) {
    console.error('Admin analytics summary failed:', error?.code || 'unexpected');
    return apiResponse({ error: '통계 정보를 불러오지 못했습니다.' }, 503);
  }
}
