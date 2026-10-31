import {adminDatabase} from '../../../../lib/server/adminData.js';
import {goError,goMember,goMutationAllowed} from '../../../../lib/server/goAuth.js';
export const runtime='nodejs';
function koreanDay(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
const columns='go_popup_enabled,go_popup_hide_until,go_popup_last_seen_kst';
export async function GET(request){
 const member=await goMember(request);
 if(!member)return goError('로그인이 필요해요.',401);
 const {data,error}=await adminDatabase().from('go_members').select(columns).eq('id',member.id).single();
 if(error)return goError('팝업 설정을 불러오지 못했어요.',503);
 return Response.json({popupEnabled:data.go_popup_enabled!==false,hideUntil:data.go_popup_hide_until||null,seenToday:data.go_popup_last_seen_kst===koreanDay(),day:koreanDay()},{headers:{'Cache-Control':'no-store'}});
}
export async function PATCH(request){
 const blocked=goMutationAllowed(request);if(blocked)return blocked;
 const member=await goMember(request);if(!member)return goError('로그인이 필요해요.',401);
 const input=await request.json().catch(()=>null);
 if(!input||!['save','resetHide','seen','hideWeek'].includes(input.action))return goError('설정 요청을 확인해주세요.');
 const changes={};
 if(input.action==='save'){
  if(typeof input.popupEnabled!=='boolean')return goError('팝업 설정을 확인해주세요.');
  changes.go_popup_enabled=input.popupEnabled;
 }else if(input.action==='resetHide'){
  changes.go_popup_hide_until=null; // Do not clear today's already-seen date.
 }else if(input.action==='seen'){
  changes.go_popup_last_seen_kst=koreanDay();
 }else{
  changes.go_popup_hide_until=new Date(Date.now()+7*86400000).toISOString();
  changes.go_popup_last_seen_kst=koreanDay();
 }
 const {data,error}=await adminDatabase().from('go_members').update(changes).eq('id',member.id).eq('disabled',false).select(columns).single();
 if(error)return goError('팝업 설정 저장에 실패했어요.',503);
 return Response.json({popupEnabled:data.go_popup_enabled!==false,hideUntil:data.go_popup_hide_until||null,seenToday:data.go_popup_last_seen_kst===koreanDay()},{headers:{'Cache-Control':'no-store'}});
}
