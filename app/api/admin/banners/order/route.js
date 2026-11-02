import {hasAdminSession,sameOrigin} from '../../../../../lib/server/adminSession.js';
import {adminDatabase,validId} from '../../../../../lib/server/adminData.js';
export const runtime='nodejs';
export async function POST(request){
 if(!hasAdminSession(request)||!sameOrigin(request))return Response.json({error:'관리자 로그인이 필요해요.'},{status:401});
 let body;try{body=await request.json()}catch{return Response.json({error:'입력값 오류'},{status:400})}
 if(!Array.isArray(body.ids)||body.ids.length>3||new Set(body.ids).size!==body.ids.length||!body.ids.every(validId))return Response.json({error:'배너 순서를 확인해주세요.'},{status:400});
 if(body.enabledIds!==undefined&&(!Array.isArray(body.enabledIds)||new Set(body.enabledIds).size!==body.enabledIds.length||!body.enabledIds.every(id=>body.ids.includes(id))))return Response.json({error:'배너 노출 상태를 확인해주세요.'},{status:400});
 try{const db=adminDatabase();const {error}=await db.rpc('go_reorder_site_banners',{ordered_ids:body.ids,...(body.enabledIds!==undefined?{enabled_ids:body.enabledIds}:{})});if(error){if(error.code==='40001')return Response.json({error:'배너 목록을 다시 불러와주세요.'},{status:409});if(error.code==='PGRST202'||error.code==='42883')return Response.json({error:'배너 순서 저장을 위한 DB 준비가 필요해요.'},{status:503});throw error;}
 return Response.json({ok:true});}catch{return Response.json({error:'배너 순서 변경에 실패했어요.'},{status:500});}
}
