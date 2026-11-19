import {adminDatabase} from '../../../../lib/server/adminData.js';
import {goMember,goError,goMutationAllowed} from '../../../../lib/server/goAuth.js';
import {goStage2ServerEnabled} from '../../../../lib/goOfficial.js';
import {parseStorePurchase,validStoreUuid} from '../../../../lib/goStore.js';
import {dogReleased} from '../../../../lib/server/goDogRelease.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const enabled=()=>goStage2ServerEnabled()&&process.env.MEONGGO_STAGE4_STORE_ENABLED==='1';
export async function GET(request){
 if(!enabled())return goError('스토어를 준비 중이에요.',503);
 const member=await goMember(request);
 if(!member)return goError('로그인이 필요해요.',401);
 const requestId=new URL(request.url).searchParams.get('requestId');
 if(!validStoreUuid(requestId))return goError('구매 요청 번호를 확인해주세요.');
 try{
  const db=adminDatabase();
  const result=await db.from('go_official_purchases')
    .select('dog_id,slot,coins,purchase_mode,created_at')
    .eq('member_id',member.id).eq('request_id',requestId).maybeSingle();
  if(result.error)throw result.error;
  const row=result.data;
  return Response.json(row?{ok:true,found:true,dogId:row.dog_id,slot:row.slot,
    price:row.coins,mode:row.purchase_mode,createdAt:row.created_at}:{ok:true,found:false},{headers});
 }catch{return goError('이전 구매 결과를 확인하지 못했어요.',500);}
}
export async function POST(request){
 if(!enabled())return goError('스토어를 준비 중이에요.',503);
 const blocked=goMutationAllowed(request);if(blocked)return blocked;
 const member=await goMember(request);
 if(!member)return goError('로그인이 필요해요.',401);
 let body;try{body=await request.json();}catch{return goError('구매 정보를 확인해주세요.');}
 let opts;try{opts=parseStorePurchase(body);}catch(e){return goError(e.message);}
 try{
  const db=adminDatabase();
  if(opts.dogId&&!await dogReleased(db,opts.dogId))return goError('아직 공개되지 않은 멍멍이예요.',409);
  const {data,error}=await db.rpc('go_store_purchase',{
    p_member:member.id,p_request:opts.requestId,p_mode:opts.mode,
    p_dog:opts.dogId,p_slot:opts.slot
  });
  if(error)throw error;
  return Response.json(data||{ok:false,error:'구매 결과가 없어요.'},{
    status:data?.ok?200:409,headers
  });
 }catch{return goError('구매 결과를 확인하지 못했어요. 이전 구매 확인을 이용해주세요.',500);}
}
