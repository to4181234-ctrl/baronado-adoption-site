import { hasAdminSession, sameOrigin } from '../../../../../lib/server/adminSession.js';
import { adminDatabase, validId } from '../../../../../lib/server/adminData.js';
import { normalizeVisitCode, validVisitDecision } from '../../../../../lib/goVisit.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const fail=(message,status)=>Response.json({error:message},{status,headers});
const enabled=()=>process.env.MEONGGO_STAGE1_COINS_ENABLED==='1';

export async function GET(request){
  if(!enabled())return fail('방문 인증 기능을 준비 중이에요.',503);
  if(!hasAdminSession(request))return fail('관리자 로그인이 필요해요.',401);
  const url=new URL(request.url);
  const rawCode=url.searchParams.get('code');
  const history=url.searchParams.get('history')==='1';
  const pageValue=url.searchParams.get('page')||'0';
  if(!/^(0|[1-9][0-9]*)$/.test(pageValue))return fail('페이지를 확인해주세요.',400);
  const page=Number(pageValue);
  if(!Number.isSafeInteger(page)||page>300)return fail('페이지를 확인해주세요.',400);
  const PAGE_SIZE=30;
  const code=rawCode?normalizeVisitCode(rawCode):null;
  if(rawCode && !code)return fail('인증 코드는 숫자 6자리예요.',400);
  try{
    const db=adminDatabase();
    let query=db.from('go_visit_requests')
      .select('id,member_id,code,status,created_at,expires_at,reviewed_at,rejected_reason',{count:'exact'})
      .order('created_at',{ascending:false})
      .range(page*PAGE_SIZE,(page+1)*PAGE_SIZE-1);
    if(code)query=query.eq('code',code);
    else if(!history)query=query.eq('status','pending').gt('expires_at',new Date().toISOString());
    else query=query.gte('created_at',new Date(Date.now()-90*86400000).toISOString());
    const {data,error,count}=await query;
    if(error)throw error;
    const rows=data||[];
    const memberIds=[...new Set(rows.map(x=>x.member_id))];
    let names=new Map();
    if(memberIds.length){
      const users=await db.from('go_members').select('id,nickname').in('id',memberIds);
      if(users.error)throw users.error;
      names=new Map((users.data||[]).map(u=>[u.id,u.nickname]));
    }
    return Response.json({
      requests:rows.map(({member_id,...record})=>({
        ...record,nickname:names.get(member_id)||'회원',
        status:record.status==='pending'&&Date.parse(record.expires_at)<=Date.now()
          ?'expired':record.status
      })),
      history,page,total:count??0,hasMore:(count??0)>(page+1)*PAGE_SIZE
    },{headers});
  }catch{return fail('인증 목록을 불러오지 못했어요.',500);}
}

export async function PATCH(request){
  if(!enabled())return fail('방문 인증 기능을 준비 중이에요.',503);
  if(!hasAdminSession(request))return fail('관리자 로그인이 필요해요.',401);
  if(!sameOrigin(request))return fail('같은 사이트에서 다시 시도해주세요.',403);
  let payload;
  try{payload=await request.json();}catch{return fail('요청 내용을 확인해주세요.',400);}
  if(!validId(payload?.id))return fail('인증 항목을 확인해주세요.',400);
  let procedure,params;
  if(payload.action==='reverse'){
    if(typeof payload.reason!=='string' || payload.reason.trim().length<2
       || payload.reason.length>300) return fail('회수 사유를 확인해주세요.',400);
    procedure='go_reverse_visit';
    params={p_request_id:payload.id,p_reason:payload.reason.trim()};
  }else if(validVisitDecision(payload.action,payload.reason)){
    procedure='go_review_visit';
    params={
      p_request_id:payload.id,p_decision:payload.action,
      p_reason:payload.action==='reject'?payload.reason:null
    };
  }else return fail('승인·반려 사유를 확인해주세요.',400);

  try{
    const {data,error}=await adminDatabase().rpc(procedure,params);
    if(error)throw error;
    return Response.json(data||{error:'인증을 처리하지 못했어요.'},{
      status:data?.ok?200:409,headers
    });
  }catch{return fail('인증 처리 중 오류가 발생했어요.',500);}
}
