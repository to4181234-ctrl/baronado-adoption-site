import {adminDatabase,validId} from '../../../../lib/server/adminData.js';
import {goMember,goError,goMutationAllowed} from '../../../../lib/server/goAuth.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const actions=['snack','praise','play'];
export async function GET(request){
 const member=await goMember(request);if(!member)return goError('로그인이 필요해요.',401);
 const id=new URL(request.url).searchParams.get('dogId');
 if(!validId(id))return goError('강아지 정보를 확인해주세요.');
 try{
  const db=adminDatabase();
  const [affinity,history,owned]=await Promise.all([
   db.from('go_affinity').select('level').eq('member_id',member.id).eq('dog_id',id).maybeSingle(),
   db.from('go_interactions').select('action,created_at').eq('member_id',member.id).eq('dog_id',id).gte('created_at',new Date(Date.now()-40*3600*1000).toISOString()).order('created_at',{ascending:false}),
   db.from('go_cards').select('id').eq('member_id',member.id).eq('dog_id',id).eq('status','approved').limit(1)
  ]);
  if(affinity.error||history.error||owned.error)throw Error();
  const now=new Date(),date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const daily=(history.data||[]).filter(x=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(x.created_at))===date);
  return Response.json({level:affinity.data?.level||0,owned:!!owned.data?.length,actions:Object.fromEntries(actions.map(action=>{const rows=daily.filter(x=>x.action===action);return [action,{remaining:Math.max(0,2-rows.length),nextAt:rows.length&&Date.now()-new Date(rows[0].created_at).getTime()<1800000?new Date(new Date(rows[0].created_at).getTime()+1800000).toISOString():null}]}))},{headers:{'Cache-Control':'no-store'}});
 }catch{return goError('교감 상태를 불러오지 못했어요.',500);}
}
export async function POST(request){
 const denied=goMutationAllowed(request);if(denied)return denied;
 const member=await goMember(request);if(!member)return goError('로그인이 필요해요.',401);
 let body;try{body=await request.json();}catch{return goError('요청을 확인해주세요.');}
 if(!validId(body?.dogId)||!actions.includes(body?.action))return goError('교감 정보를 확인해주세요.');
 try{const db=adminDatabase();const r=await db.rpc('go_do_interaction',{p_member_id:member.id,p_dog_id:body.dogId,p_action:body.action});if(r.error)throw r.error;
  if(!r.data?.ok)return Response.json(r.data||{error:'교감할 수 없어요.'},{status:409,headers:{'Cache-Control':'no-store'}});
  return Response.json(r.data,{headers:{'Cache-Control':'no-store'}});
 }catch{return goError('교감 기록을 저장하지 못했어요.',500);}
}
