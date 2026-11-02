import {hasAdminSession,sameOrigin} from '../../../../../lib/server/adminSession.js';
import {adminDatabase,validId} from '../../../../../lib/server/adminData.js';
export const dynamic='force-dynamic';
export async function GET(request){
 if(!hasAdminSession(request))return Response.json({error:'관리자 로그인이 필요해요.'},{status:401});
 const cardId=new URL(request.url).searchParams.get('cardId');if(!validId(cardId))return Response.json({error:'카드를 확인해주세요.'},{status:400});
 try{const {data,error}=await adminDatabase().from('go_reports').select('card_id,member_id,reason,reason_detail,status,created_at,reviewed_at').eq('card_id',cardId).order('created_at',{ascending:false}).limit(100);if(error)throw error;return Response.json({reports:data},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'신고 내역을 불러오지 못했어요.'},{status:503});}
}
export async function PATCH(request){
 if(!hasAdminSession(request)||!sameOrigin(request))return Response.json({error:'관리자 로그인이 필요해요.'},{status:401});
 try{const {cardId,reporterId}=await request.json();if(!validId(cardId)||!validId(reporterId))return Response.json({error:'신고를 확인해주세요.'},{status:400});
  const {data,error}=await adminDatabase().from('go_reports').update({status:'reviewed',reviewed_at:new Date().toISOString()}).eq('card_id',cardId).eq('member_id',reporterId).select('card_id').maybeSingle();if(error)throw error;if(!data)return Response.json({error:'신고를 찾지 못했어요.'},{status:404});return Response.json({ok:true});
 }catch{return Response.json({error:'검토 상태를 저장하지 못했어요.'},{status:503});}
}
