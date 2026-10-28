import {adminDatabase,validId} from '../../../../../../lib/server/adminData.js';
import {goError,goMember,goMutationAllowed,scopedSignature} from '../../../../../../lib/server/goAuth.js';
export const runtime='nodejs';
export async function POST(request,{params}){
 const blocked=goMutationAllowed(request);if(blocked)return blocked;
 const {id}=await params;if(!validId(id))return goError('카드를 확인해주세요.');
 const input=await request.json().catch(()=>null);if(!input||!validId(input.eventId)||!['save','share','download'].includes(input.kind))return goError('저장·공유 기록을 확인해주세요.');
 try{const member=await goMember(request);const ip=(request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,64);const actor=scopedSignature(member?`member:${member.id}`:`visitor:${ip}`,'card-share');const {data,error}=await adminDatabase().rpc('go_record_card_share',{p_card:id,p_member:member?.id||null,p_event:input.eventId,p_actor:actor,p_kind:input.kind});if(error)return goError('저장·공유 집계에 실패했어요.',error.message?.includes('card not public')?404:error.message?.includes('rate limit')?429:500);return Response.json(data,{headers:{'Cache-Control':'no-store'}});}catch{return goError('저장·공유 집계에 실패했어요.',500);}
}
