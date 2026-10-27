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
  const { reason } = await request.json().catch(() => ({}));
  if (!['privacy', 'wrong_dog', 'inappropriate'].includes(reason)) return goError('신고 이유를 선택해주세요.');
  const db = adminDatabase();
  const { data: card } = await db.from('go_cards').select('id,status,member_id').eq('id', id).maybeSingle();
  if (!card || card.status !== 'approved' || card.member_id === member.id) return goError('신고할 수 없는 카드예요.', 404);
  const { error } = await db.from('go_reports').insert({ card_id: id, member_id: member.id, reason });
  if (error?.code === '23505') return goError('이미 신고한 카드예요.', 409);
  if (error) return goError('신고를 저장하지 못했어요.', 500);
  return Response.json({ ok: true });
}
