import { adminDatabase } from '../../../../lib/server/adminData.js';
import { goError, goMember } from '../../../../lib/server/goAuth.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const member = await goMember(request);
  if (!member) return goError('로그인이 필요해요.', 401);
  const { data, error } = await adminDatabase().rpc('go_album_photo_counts', { p_member: member.id });
  if (error) return goError('모은 카드 수를 불러오지 못했어요.', 500);
  return Response.json({ counts: Object.fromEntries(data.map(row => [row.dog_id, Number(row.photo_count)])) }, { headers: { 'Cache-Control': 'no-store' } });
}
