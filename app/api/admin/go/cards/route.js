import { hasAdminSession, sameOrigin } from '../../../../../lib/server/adminSession.js';
import { adminDatabase, validId } from '../../../../../lib/server/adminData.js';
import { loadGoCards } from '../../../../../lib/server/goCards.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!hasAdminSession(request)) return Response.json({ error: '관리자 로그인이 필요해요.' }, { status: 401 });
  try {
    const page = Math.max(0, Math.min(40, Number(new URL(request.url).searchParams.get('page')) || 0));
    const moderation = new URL(request.url).searchParams.get('status') === 'approved' ? 'approved' : 'pending';
    return Response.json(await loadGoCards({ moderation, page }), { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: '검토할 카드를 가져오지 못했어요.' }, { status: 500 }); }
}

export async function PATCH(request) {
  if (!hasAdminSession(request) || !sameOrigin(request)) return Response.json({ error: '관리자 로그인이 필요해요.' }, { status: 401 });
  try {
    const { id, status } = await request.json();
    if (!validId(id) || !['approved', 'rejected', 'hidden'].includes(status)) return Response.json({ error: '처리 상태를 확인해주세요.' }, { status: 400 });
    const { error } = await adminDatabase().from('go_cards').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch { return Response.json({ error: '카드를 검토하지 못했어요.' }, { status: 500 }); }
}
