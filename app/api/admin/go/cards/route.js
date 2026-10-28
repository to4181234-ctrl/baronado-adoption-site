import { hasAdminSession, sameOrigin } from '../../../../../lib/server/adminSession.js';
import { adminDatabase, validId } from '../../../../../lib/server/adminData.js';
import { loadGoCards } from '../../../../../lib/server/goCards.js';
import { REJECTION_REASONS } from '../../../../../lib/goShared.js';
import { parseBulkCardIds } from '../../../../../lib/goBulkDelete.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  if (!hasAdminSession(request)) return Response.json({ error: '관리자 로그인이 필요해요.' }, { status: 401 });
  try {
    const params = new URL(request.url).searchParams;
    const page = Math.max(0, Math.min(1000, Number(params.get('page')) || 0));
    const moderation = ['approved','rejected'].includes(params.get('status')) ? params.get('status') : 'approved';
    return Response.json(await loadGoCards({ moderation, page, query: (params.get('q') || '').slice(0, 80) }), { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: '게시물을 가져오지 못했어요.' }, { status: 500 }); }
}
export async function PATCH(request) {
  if (!hasAdminSession(request) || !sameOrigin(request)) return Response.json({ error: '관리자 로그인이 필요해요.' }, { status: 401 });
  try {
    const { id, status: requestedStatus, reason: requestedReason, note: requestedNote } = await request.json();
    // Older open admin tabs may still submit the former "hidden" action.
    const status = requestedStatus === 'hidden' ? 'rejected' : requestedStatus;
    const reason = requestedReason || (requestedStatus === 'hidden' ? 'other' : null);
    const note = requestedNote || (requestedStatus === 'hidden' ? '공개가 중지된 게시물입니다.' : null);
    if (!validId(id) || !['approved','rejected','hidden'].includes(status)) return Response.json({ error: '처리 상태를 확인해주세요.' }, { status: 400 });
    if (status === 'rejected' && (!Object.hasOwn(REJECTION_REASONS, reason) || (reason === 'other' && (typeof note !== 'string' || !note.trim() || note.trim().length > 300)))) return Response.json({ error: '비공개 사유를 선택하고 기타 사유는 300자 이내로 적어주세요.' }, { status: 400 });
    const db = adminDatabase();
    const { error } = await db.from('go_cards').update({ status, reviewed_at: new Date().toISOString(), rejection_reason: status === 'rejected' ? reason : null, rejection_note: status === 'rejected' && reason === 'other' ? note.trim() : null }).eq('id', id);
    if (error) throw error;
    if (status !== 'approved') await db.from('go_picks').delete().eq('card_id', id);
    return Response.json({ ok: true });
  } catch { return Response.json({ error: '게시물 검토에 실패했어요.' }, { status: 500 }); }
}

export async function DELETE(request) {
  if (!hasAdminSession(request) || !sameOrigin(request)) return Response.json({ error: '관리자 로그인이 필요해요.' }, { status: 401 });
  try {
    const input = await request.json();
    if (Array.isArray(input?.ids)) {
      let ids;
      try { ids = parseBulkCardIds(input.ids); }
      catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
      const status = input.status;
      if (!['approved','rejected'].includes(status)) return Response.json({ error: '공개·비공개 목록을 다시 선택해주세요.' }, { status: 400 });
      const db = adminDatabase();
      const { data: matched, error: lookupError } = await db.from('go_cards')
        .select('id').in('id', ids).eq('status', status);
      if (lookupError) throw lookupError;
      if (matched.length !== ids.length) return Response.json({ error: '일부 게시물의 상태가 변경됐어요. 목록을 새로고침해주세요.' }, { status: 409 });

      const { data: deleted, error } = await db.from('go_cards').delete()
        .in('id', ids).eq('status', status).select('id,image_path');
      if (error) throw error;
      const files = (deleted || []).map(card => card.image_path).filter(Boolean);
      const cleanup = files.length ? await db.storage.from('go-cards').remove(files) : { error: null };
      return Response.json({
        ok: true, deletedIds: (deleted || []).map(card => card.id),
        cleanupPending: Boolean(cleanup.error),
        partial: (deleted || []).length !== ids.length
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const { id } = input || {};
    if (!validId(id)) return Response.json({ error: '게시물을 확인해주세요.' }, { status: 400 });
    const db = adminDatabase();
    const { data: card, error: readError } = await db.from('go_cards').select('id,image_path').eq('id', id).maybeSingle();
    if (readError) throw readError;
    if (!card) return Response.json({ error: '게시물을 찾지 못했어요.' }, { status: 404 });
    const { error } = await db.from('go_cards').delete().eq('id', id);
    if (error) throw error;
    const cleanup = await db.storage.from('go-cards').remove([card.image_path]);
    return Response.json({ ok: true, cleanupPending: Boolean(cleanup.error) });
  } catch { return Response.json({ error: '게시물을 삭제하지 못했어요.' }, { status: 500 }); }
}
