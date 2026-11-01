import {adminDatabase,validId} from '../../../../../../lib/server/adminData.js';
import {hasAdminSession} from '../../../../../../lib/server/adminSession.js';
import {authorizeMutation,apiResponse} from '../../../../../../lib/server/adminHttp.js';
import {loadGoCards} from '../../../../../../lib/server/goCards.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function getId(context){const {id}=await context.params;return validId(id)?id:null}
export async function GET(request,context){if(!hasAdminSession(request))return apiResponse({error:'관리자 로그인이 필요해요.'},401);const id=await getId(context);if(!id)return apiResponse({error:'카드를 확인해주세요.'},400);try{const found=await loadGoCards({adminAll:true,id,limit:1});if(!found.cards.length)return apiResponse({error:'카드를 찾지 못했어요.'},404);
 const {data:reports,error}=await adminDatabase().from('go_reports').select('reason,detail,created_at,review_status,review_action').eq('card_id',id).order('created_at',{ascending:false});if(error)throw error;return apiResponse({card:found.cards[0],reports:reports||[]})
 }catch{return apiResponse({error:'카드 상세를 불러오지 못했어요.'},500)}}
export async function PATCH(request,context){const denied=authorizeMutation(request);if(denied)return denied;const id=await getId(context);if(!id)return apiResponse({error:'카드를 확인해주세요.'},400);
 try{const input=await request.json();if(input?.action!=='hide'&&input?.action!=='restore')return apiResponse({error:'처리 내용을 확인해주세요.'},400);const db=adminDatabase();const {data:prior,error:readError}=await db.from('go_cards').select('id,status').eq('id',id).maybeSingle();if(readError)throw readError;if(!prior)return apiResponse({error:'카드를 찾지 못했어요.'},404);
 const status=input.action==='hide'?'hidden':'approved';const {error}=await db.from('go_cards').update({status,reviewed_at:new Date().toISOString()}).eq('id',id);if(error)throw error;
 if(status!=='approved')await db.from('go_picks').delete().eq('card_id',id);
 return apiResponse({status})
 }catch{return apiResponse({error:'카드 노출 상태를 변경하지 못했어요.'},500)}}
export async function DELETE(request,context){const denied=authorizeMutation(request);if(denied)return denied;const id=await getId(context);if(!id)return apiResponse({error:'카드를 확인해주세요.'},400);
 try{const db=adminDatabase();const {data:prior,error:readError}=await db.from('go_cards').select('id,image_path').eq('id',id).maybeSingle();if(readError)throw readError;if(!prior)return apiResponse({error:'카드를 찾지 못했어요.'},404);
 const {error}=await db.from('go_cards').delete().eq('id',id);if(error)throw error;const cleanup=prior.image_path?await db.storage.from('go-cards').remove([prior.image_path]):{error:null};return apiResponse({ok:true,cleanupPending:Boolean(cleanup.error)})
 }catch{return apiResponse({error:'카드를 삭제하지 못했어요.'},500)}}
