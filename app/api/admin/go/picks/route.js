import { hasAdminSession, sameOrigin } from '../../../../../lib/server/adminSession.js';
import { adminDatabase, validId } from '../../../../../lib/server/adminData.js';
import { loadGoPicks } from '../../../../../lib/server/goCards.js';
import { koreaMonth, monthDate } from '../../../../../lib/goShared.js';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  if (!hasAdminSession(request)) return Response.json({ error: '관리자 로그인이 필요해요.' }, { status: 401 });
  try { const month = new URL(request.url).searchParams.get('month') || koreaMonth(); return Response.json({ cards: await loadGoPicks(month, null, true) }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'pick을 불러오지 못했어요.' }, { status: 400 }); }
}
export async function POST(request) {
  if (!hasAdminSession(request) || !sameOrigin(request)) return Response.json({ error: '관리자 로그인이 필요해요.' }, { status: 401 });
  try {
    const { month, cardId } = await request.json();
    if (!validId(cardId)) throw new Error();
    const { error } = await adminDatabase().rpc('go_set_pick', { p_month: monthDate(month), p_card: cardId });
    if (error) return Response.json({ error: 'pick은 한 달에 최대 3개까지 선택할 수 있어요. 기존 pick을 해제하거나 공개 상태를 확인해주세요.' }, { status: 409 });
    return Response.json({ ok: true });
  } catch { return Response.json({ error: '월과 게시물을 확인해주세요.' }, { status: 400 }); }
}
export async function DELETE(request) {
  if (!hasAdminSession(request) || !sameOrigin(request)) return Response.json({ error: '관리자 로그인이 필요해요.' }, { status: 401 });
  try { const { month, cardId } = await request.json(); if (!validId(cardId)) throw new Error(); const { error } = await adminDatabase().from('go_picks').delete().eq('month', monthDate(month)).eq('card_id', cardId); if (error) throw error; return Response.json({ ok: true }); }
  catch { return Response.json({ error: 'pick 해제에 실패했어요.' }, { status: 400 }); }
}
