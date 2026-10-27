import { adminDatabase, validId } from '../../../../../lib/server/adminData.js';
import { goError, goMember, goMutationAllowed } from '../../../../../lib/server/goAuth.js';
import { loadGoCard } from '../../../../../lib/server/goCards.js';
import { validatePostEdit } from '../../../../../lib/goPostEdit.js';

export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  const blocked = goMutationAllowed(request); if (blocked) return blocked;
  const member = await goMember(request); if (!member) return goError('로그인이 필요해요.', 401);
  const { id } = await params; if (!validId(id)) return goError('카드를 확인해주세요.');
  let edit;
  try { edit=validatePostEdit(await request.json()); } catch(error) { return goError(error.message||'수정 내용을 확인해주세요.'); }
  if(edit.editContent&&!validId(edit.dogId))return goError('멍멍이를 확인해주세요.');
  const {error}=await adminDatabase().rpc('go_edit_owned_card',{p_member:member.id,p_card:id,p_edit_content:edit.editContent,p_edit_ratings:edit.editRatings,p_title:edit.title,p_description:edit.description,p_dog:edit.dogId,p_cuteness:edit.ratings.cuteness,p_charm:edit.ratings.charm,p_affection:edit.ratings.affection});
  if(error)return goError(error.message?.includes('owned card')?'내 카드를 찾지 못했어요.':'게시물 수정에 실패했어요.',error.message?.includes('owned card')?404:400);
  const card=await loadGoCard(id,member);
  return Response.json({card,ratings:card?.ratings},{headers:{'Cache-Control':'no-store'}});
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!validId(id)) return goError('게시물을 확인해주세요.', 404);
    const card = await loadGoCard(id, await goMember(request));
    return card ? Response.json({ card }, { headers: { 'Cache-Control': 'no-store' } }) : goError('게시물을 찾지 못했어요.', 404);
  } catch { return goError('게시물을 불러오지 못했어요.', 500); }
}

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
