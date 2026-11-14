import {adminDatabase,validId} from '../../../../../lib/server/adminData.js';
import {goError,goMember,goMutationAllowed} from '../../../../../lib/server/goAuth.js';
import {goStage2ServerEnabled} from '../../../../../lib/goOfficial.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request){
 if(!goStage2ServerEnabled())return goError('멍카드 상점을 준비 중이에요.',503);
 const denied=goMutationAllowed(request);if(denied)return denied;
 const member=await goMember(request);if(!member)return goError('로그인이 필요해요.',401);
 let body;try{body=await request.json();}catch{return goError('구매 요청을 확인해주세요.');}
 if(!validId(body?.dogId)||!validId(body?.requestId))
  return goError('구매할 강아지와 요청 번호를 확인해주세요.');
 try{
  const {data,error}=await adminDatabase().rpc('go_official_purchase',{
   p_member:member.id,p_dog:body.dogId,p_request:body.requestId
  });
  if(error)throw error;
  return Response.json(data,{status:data?.ok?200:409,headers:{'Cache-Control':'no-store'}});
 }catch{return goError('구매 결과를 확인하지 못했어요. 같은 요청 번호로 다시 확인해주세요.',500);}
}
