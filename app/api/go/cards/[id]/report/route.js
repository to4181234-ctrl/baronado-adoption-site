import { adminDatabase, validId } from '../../../../../../lib/server/adminData.js';
import { goError, goMember, goMutationAllowed } from '../../../../../../lib/server/goAuth.js';

import {validateReport} from '../../../../../../lib/goReport.js';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const blocked = goMutationAllowed(request);
  if (blocked) return blocked;
  const member = await goMember(request);
  if (!member) return goError('로그인이 필요해요.', 401);
  const { id } = await params;
  if (!validId(id)) return goError('카드를 확인해주세요.');
  let report;try{report=validateReport(await request.json());}catch(e){return goError(e.message||'신고 내용을 확인해주세요.');}
  try{
   const db=adminDatabase();
   const {data:card,error:lookupError}=await db.from('go_cards').select('id,status,member_id').eq('id',id).maybeSingle();
   if(lookupError)return goError('신고할 카드를 확인하지 못했어요.',500);
   if(!card||card.status!=='approved'||card.member_id===member.id)return goError('신고할 수 없는 카드예요.',404);
   const {error}=await db.from('go_reports').insert({card_id:id,member_id:member.id,reason:report.reason,reason_detail:report.details,status:'pending'});
   if(error?.code==='23505')return goError('이미 신고한 카드예요.',409);
   if(error)return goError('신고를 접수하지 못했어요. 잠시 후 다시 시도해주세요.',503);
  }catch{return goError('신고를 접수하지 못했어요.',500);}
  return Response.json({ ok: true });
}
