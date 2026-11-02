import {hasAdminSession,sameOrigin} from '../../../../lib/server/adminSession.js';
import {adminDatabase,validId} from '../../../../lib/server/adminData.js';
import {bannerPayload,BANNER_LIMIT} from '../../../../lib/bannerRules.js';
export const runtime='nodejs';export const dynamic='force-dynamic';
const unauthorized=()=>Response.json({error:'관리자 로그인이 필요해요.'},{status:401});
const unavailable=()=>Response.json({error:'배너 테이블 연결 상태를 확인해주세요. 미적용 마이그레이션은 승인 전 실행하지 마세요.'},{status:503});
export async function GET(request){
 if(!hasAdminSession(request))return unauthorized();
 try{const {data,error}=await adminDatabase().from('site_banners').select('*').order('sort_order',{ascending:true});if(error)throw error;return Response.json({banners:data||[]},{headers:{'Cache-Control':'no-store'}});}catch{return unavailable();}
}
export async function POST(request){
 if(!hasAdminSession(request)||!sameOrigin(request))return unauthorized();
 let body;try{body=await request.json()}catch{return Response.json({error:'입력값을 확인해주세요.'},{status:400})}
 let payload;try{payload=bannerPayload(body)}catch(e){return Response.json({error:e.message},{status:400})}
 try{const db=adminDatabase();const {count,error:countError}=await db.from('site_banners').select('id',{head:true,count:'exact'});if(countError)throw countError;if(count>=BANNER_LIMIT)return Response.json({error:'숨긴 배너를 포함해 최대 3개까지 등록할 수 있어요.'},{status:409});const {data,error}=await db.from('site_banners').insert({...payload,sort_order:count}).select().single();if(error)throw error;return Response.json({banner:data},{status:201});}catch{return unavailable();}
}
export async function PATCH(request){
 if(!hasAdminSession(request)||!sameOrigin(request))return unauthorized();
 let body;try{body=await request.json()}catch{return Response.json({error:'입력값을 확인해주세요.'},{status:400})}
 if(!validId(body?.id))return Response.json({error:'배너 ID를 확인해주세요.'},{status:400});
 let payload;try{payload=bannerPayload(body)}catch(e){return Response.json({error:e.message},{status:400})}
 try{const {data,error}=await adminDatabase().from('site_banners').update(payload).eq('id',body.id).select().single();if(error)throw error;return Response.json({banner:data});}catch{return unavailable();}
}
export async function DELETE(request){
 if(!hasAdminSession(request)||!sameOrigin(request))return unauthorized();
 let body;try{body=await request.json()}catch{return Response.json({error:'입력값을 확인해주세요.'},{status:400})}
 if(!validId(body?.id))return Response.json({error:'배너 ID를 확인해주세요.'},{status:400});
 try{const {error}=await adminDatabase().from('site_banners').delete().eq('id',body.id);if(error)throw error;return Response.json({ok:true});}catch{return unavailable();}
}
