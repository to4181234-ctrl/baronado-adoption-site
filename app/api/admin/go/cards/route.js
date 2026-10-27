import { hasAdminSession, sameOrigin } from '../../../../../lib/server/adminSession.js';
import { adminDatabase, validId } from '../../../../../lib/server/adminData.js';
import { loadGoCards } from '../../../../../lib/server/goCards.js';
import { REJECTION_REASONS } from '../../../../../lib/goShared.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  if (!hasAdminSession(request)) return Response.json({ error: '관리자 로그인이 필요해요.' }, { status: 401 });
  try {
    const params = new URL(request.url).searchParams;
    const page = Math.max(0, Math.min(1000, Number(params.get('page')) || 0));
    const moderation = ['approved','rejected'].includes(params.get('status')) ? params.get('status') : 'pending';
    return Response.json(await loadGoCards({ moderation, page, query: (params.get('q') || '').slice(0, 80) }), { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: '게시물을 가져오지 못했어요.' }, { status: 500 }); }
}
export async function PATCH(request) {
  if (!hasAdminSession(request) || !sameOrigin(request)) return Response.json({ error: '관리자 로그인이 필요해요.' }, { status: 401 });
  try {
    const { id, status, reason, note } = await request.json();
    if (!validId(id) || !['approved','rejected','hidden'].includes(status)) return Response.json({ error: '처리 상태를 확인해주세요.' }, { status: 400 });
    if (status === 'rejected' && (!Object.hasOwn(REJECTION_REASONS, reason) || (reason === 'other' && (typeof note !== 'string' || !note.trim() || note.trim().length > 300)))) return Response.json({ error: '반려 사유를 선택하고 기타 사유는 300자 이내로 적어주세요.' }, { status: 400 });
    const db = adminDatabase();
    const { error } = await db.from('go_cards').update({ status, reviewed_at: new Date().toISOString(), rejection_reason: status === 'rejected' ? reason : null, rejection_note: status === 'rejected' && reason === 'other' ? note.trim() : null }).eq('id', id);
    if (error) throw error;
    if (status !== 'approved') await db.from('go_picks').delete().eq('card_id', id);
    return Response.json({ ok: true });
  } catch { return Response.json({ error: '게시물 검토에 실패했어요.' }, { status: 500 }); }
}
