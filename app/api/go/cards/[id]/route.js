import { adminDatabase, validId } from '../../../../../lib/server/adminData.js';
import { goError, goMember, goMutationAllowed } from '../../../../../lib/server/goAuth.js';

export const runtime = 'nodejs';

export async function DELETE(request, { params }) {
  const blocked = goMutationAllowed(request);
  if (blocked) return blocked;
  const member = await goMember(request);
  if (!member) return goError('로그인이 필요해요.', 401);
  const { id } = await params;
  if (!validId(id)) return goError('카드를 확인해주세요.');
  const db = adminDatabase();
  const { data: card } = await db.from('go_cards').select('id,image_path').eq('id', id).eq('member_id', member.id).maybeSingle();
  if (!card) return goError('내 카드를 찾지 못했어요.', 404);
  const { error } = await db.from('go_cards').delete().eq('id', id).eq('member_id', member.id);
  if (error) return goError('삭제하지 못했어요.', 500);
  await db.storage.from('go-cards').remove([card.image_path]);
  return Response.json({ ok: true });
}
