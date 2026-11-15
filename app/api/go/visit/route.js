import { adminDatabase, validId } from '../../../../lib/server/adminData.js';
import { goError, goMember, goMutationAllowed } from '../../../../lib/server/goAuth.js';
import { koreaDay } from '../../../../lib/goCoins.js';
import { isVisitRequestWindow } from '../../../../lib/goVisit.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const enabled=()=>process.env.MEONGGO_STAGE1_COINS_ENABLED==='1';

export async function GET(request) {
  if(!enabled()) return goError('방문 인증 기능을 준비 중이에요.',503);
  const member=await goMember(request);
  if(!member) return goError('로그인이 필요해요.',401);
  try {
    const {data,error}=await adminDatabase()
      .from('go_visit_requests')
      .select('id,code,status,created_at,expires_at,reviewed_at,rejected_reason')
      .eq('member_id',member.id)
      .order('created_at',{ascending:false}).limit(1);
    if(error) throw error;
    const item=data?.[0]||null;
    const expired=item?.status==='pending'&&Date.parse(item.expires_at)<=Date.now();
    const request=item?{
      id:item.id, code:item.code,
      status:expired?'expired':item.status,
      expiresAt:item.expires_at,
      createdAt:item.created_at,
      rejectedReason:item.rejected_reason,
      retryAt:item.status==='rejected'&&item.reviewed_at
        ?new Date(Date.parse(item.reviewed_at)+60000).toISOString():null
    }:null;
    return Response.json({
      request,
      canRequestNow:isVisitRequestWindow(),
      today:koreaDay()
    },{headers});
  } catch {
    return goError('방문 인증 현황을 불러오지 못했어요.',500);
  }
}

export async function POST(request){
  if(!enabled()) return goError('방문 인증 기능을 준비 중이에요.',503);
  const denied=goMutationAllowed(request);
  if(denied) return denied;
  const member=await goMember(request);
  if(!member) return goError('로그인이 필요해요.',401);
  let payload;
  try{payload=await request.json();}catch{return goError('요청 내용을 확인해주세요.');}
  if(!payload || typeof payload!=='object') return goError('요청 내용을 확인해주세요.');
  let procedure,params;
  if(payload.action==='request'){
    procedure='go_request_visit';
    params={p_member_id:member.id};
  }else if(payload.action==='cancel'&&validId(payload.requestId)){
    procedure='go_cancel_visit';
    params={p_member_id:member.id,p_request_id:payload.requestId};
  }else return goError('인증 요청을 확인해주세요.');
  try{
    const {data,error}=await adminDatabase().rpc(procedure,params);
    if(error)throw error;
    return Response.json(data||{error:'처리하지 못했어요.'},{
      status:data?.ok?200:409,headers
    });
  }catch{return goError('방문 인증을 처리하지 못했어요.',500);}
}
