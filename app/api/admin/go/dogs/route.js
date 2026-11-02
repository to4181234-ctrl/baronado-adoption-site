import {hasAdminSession} from '../../../../../lib/server/adminSession.js';
import {adminDatabase} from '../../../../../lib/server/adminData.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
 if(!hasAdminSession(request))return Response.json({error:'관리자 로그인이 필요해요.'},{status:401});
 try{
  const {data,error}=await adminDatabase().from('dogs').select('id,name').order('name',{ascending:true});
  if(error)throw error;
  return Response.json({dogs:data||[]},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'강아지 필터를 불러오지 못했어요.'},{status:500});}
}
