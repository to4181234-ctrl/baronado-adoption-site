import { createHmac } from 'node:crypto';
import { adminDatabase } from '../../../../lib/server/adminData';
import { sameOrigin } from '../../../../lib/server/adminSession';
import { apiResponse, readJson } from '../../../../lib/server/adminHttp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request) {
  // Only real public production visitors should affect statistics.
  if (process.env.VERCEL_ENV !== 'production') return new Response(null, { status: 204 });
  if (!sameOrigin(request)) return apiResponse({ error: '허용되지 않은 요청입니다.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return apiResponse({ error: '요청 형식이 올바르지 않습니다.' }, 415);
  }
  try {
    const { eventType, page, dogId, visitorId } = await readJson(request, 420);
    if (!['page_view', 'share_click', 'inquiry_click'].includes(eventType)
      || !['home', 'residents', 'dog'].includes(page)
      || (eventType === 'inquiry_click' && page === 'residents')
      || typeof visitorId !== 'string'
      || !/^[a-f0-9-]{32,36}$/i.test(visitorId)
      || (page === 'dog' && !UUID.test(dogId || ''))
      || (page !== 'dog' && dogId != null)) {
      return apiResponse({ error: '요청 항목이 올바르지 않습니다.' }, 400);
    }
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret || secret.length < 32) throw new Error('Missing analytics configuration');
    const visitorHash = createHmac('sha256', secret)
      .update('baronado-analytics-v1:' + visitorId).digest('hex');

    // Count at most one page load of the same path per visitor per minute,
    // preventing accidental refreshes from inflating view counts.
    // Each distinct share click is recorded, whether sharing later succeeds or not.
    const now = Date.now();
    const bucket = eventType === 'page_view'
      ? Math.floor(now / 60_000) * 60_000 : now;
    const pageKey = page === 'dog' ? 'dog:' + dogId : page;
    const { error } = await adminDatabase().from('site_analytics_events').upsert({
      event_type: eventType,
      page_key: pageKey,
      dog_id: page === 'dog' ? dogId : null,
      visitor_hash: visitorHash,
      bucket_start: new Date(bucket).toISOString()
    }, {
      onConflict: 'visitor_hash,event_type,page_key,bucket_start',
      ignoreDuplicates: true
    });
    if (error) throw error;
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Analytics event could not be stored:', error?.code || 'unexpected');
    return apiResponse({ error: '통계를 기록하지 못했습니다.' }, 503);
  }
}
