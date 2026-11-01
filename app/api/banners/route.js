import {adminDatabase} from '../../../lib/server/adminData.js';
import {targetHref} from '../../../lib/bannerRules.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  const {data,error}=await adminDatabase().from('site_banners').select('id,name,alt,image_url,link_type,external_url,display_order').eq('visible',true).order('display_order',{ascending:true}).limit(3);
  if(error){if(error.code==='42P01'||error.code==='PGRST205')return Response.json({error:'배너 DB 준비 전'}, {status:503,headers:{'Cache-Control':'no-store'}});throw error;}
  return Response.json({banners:(data||[]).map(b=>({id:b.id,name:b.name,alt:b.alt,imageUrl:b.image_url,href:targetHref(b.link_type,b.external_url)}))},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'배너 정보를 불러오지 못했어요.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
