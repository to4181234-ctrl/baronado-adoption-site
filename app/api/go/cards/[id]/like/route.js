import { adminDatabase, validId } from '../../../../../../lib/server/adminData.js';
import { goError, goMember, goMutationAllowed } from '../../../../../../lib/server/goAuth.js';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const blocked = goMutationAllowed(request);
  if (blocked) return blocked;
  const member = await goMember(request);
  if (!member) return goError('로그인이 필요해요.', 401);
  const { id } = await params;
  if (!validId(id)) return goError('카드를 확인해주세요.');
  const db = adminDatabase();
  const { data: card } = await db.from('go_cards').select('id,status').eq('id', id).maybeSingle();
  if (!card || card.status !== 'approved') return goError('공개된 카드에서만 좋아요를 누를 수 있어요.', 404);
  const { data: existing } = await db.from('go_likes').select('card_id').eq('card_id', id).eq('member_id', member.id).maybeSingle();
  const result = existing
    ? await db.from('go_likes').delete().eq('card_id', id).eq('member_id', member.id)
    : await db.from('go_likes').upsert({ card_id: id, member_id: member.id }, { onConflict: 'member_id,card_id' });
  if (result.error) return goError('좋아요를 저장하지 못했어요.', 500);
  const { count } = await db.from('go_likes').select('*', { count: 'exact', head: true }).eq('card_id', id);
  return Response.json({ liked: !existing, likeCount: count || 0 });
}
