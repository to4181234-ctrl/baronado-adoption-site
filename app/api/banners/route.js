import {adminDatabase} from '../../../lib/server/adminData.js';
import {bannerHref} from '../../../lib/bannerRules.js';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){
 try{const {data,error}=await adminDatabase().from('site_banners').select('id,title,image_url,image_alt,target_type,target_url,sort_order').eq('enabled',true).order('sort_order',{ascending:true}).limit(3);if(error)throw error;return Response.json({banners:(data||[]).map(b=>({id:b.id,alt:b.image_alt||b.title,image:b.image_url,isLogo:b.image_url==='/figma-v3/hero-logo.svg',href:bannerHref(b)}))},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'배너를 불러오지 못했어요.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
