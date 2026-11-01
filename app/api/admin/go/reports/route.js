import {adminDatabase,validId} from '../../../../../lib/server/adminData.js';
import {hasAdminSession} from '../../../../../lib/server/adminSession.js';
import {authorizeMutation,apiResponse,badRequest,readJson} from '../../../../../lib/server/adminHttp.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
 if(!hasAdminSession(request))return apiResponse({error:'관리자 로그인이 필요해요.'},401);
 try{const params=new URL(request.url).searchParams;const handled=params.get('handled')==='1';const search=(params.get('q')||'').trim().slice(0,80);const page=Math.max(0,Math.min(500,Number(params.get('page'))||0));const db=adminDatabase();
  let query=db.from('go_report_moderation_index').select('card_id,member_id,reason,detail,created_at,review_status,review_action,reviewed_at',{count:'exact'}).eq('review_status',handled?'completed':'pending');
  if(search)query=query.ilike('search_text','%'+search.replace(/[\\%_]/g,'\\$&')+'%');
  const {data,count,error}=await query.order('created_at',{ascending:false}).range(page*5,page*5+4);if(error)throw error;
  const ids=[...new Set((data||[]).map(r=>r.card_id))];
  const cards=ids.length?await db.from('go_card_index').select('id,title,nickname,dog_name').in('id',ids):{data:[],error:null};if(cards.error)throw cards.error;
  const byId=new Map((cards.data||[]).map(c=>[c.id,c]));
  return apiResponse({reports:(data||[]).map(row=>({...row,card:byId.get(row.card_id)||null})),total:count||0});
 }catch{return apiResponse({error:'신고 목록을 불러오지 못했어요. 마이그레이션이 필요할 수 있어요.'},503)}
}
export async function PATCH(request){
 const denied=authorizeMutation(request);if(denied)return denied;
 try{const data=await readJson(request,3000);const {cardId,memberId,action}=data||{};
  if(!validId(cardId)||!validId(memberId)||!['no_issue','hide','delete'].includes(action))return apiResponse({error:'처리 내용을 확인해주세요.'},400);
  const db=adminDatabase();
  const {data:card,error:cardError}=await db.from('go_cards').select('id,image_path').eq('id',cardId).maybeSingle();if(cardError)throw cardError;
  if(!card)return apiResponse({error:'카드가 삭제되어 처리할 수 없어요.'},409);
  const {error:reviewError}=await db.rpc('review_go_report',{p_card_id:cardId,p_member_id:memberId,p_action:action});
  if(reviewError){if(reviewError.code==='P0002')return apiResponse({error:'이미 처리된 신고예요.'},409);throw reviewError}
  let cleanupPending=false;
  if(action==='delete'&&card.image_path){const cleanup=await db.storage.from('go-cards').remove([card.image_path]);cleanupPending=Boolean(cleanup.error)}
  return apiResponse({ok:true,cleanupPending});
 }catch(e){return badRequest(e)}
}
