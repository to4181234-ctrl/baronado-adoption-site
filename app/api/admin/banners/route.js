import {adminDatabase} from '../../../../lib/server/adminData.js';
import {hasAdminSession} from '../../../../lib/server/adminSession.js';
import {authorizeMutation,apiResponse,badRequest,readJson} from '../../../../lib/server/adminHttp.js';
import {MAX_BANNERS,normalizedOrder,validateBanner} from '../../../../lib/bannerRules.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
 if(!hasAdminSession(request))return apiResponse({error:'관리자 로그인이 필요해요.'},401);
 try{const {data,error}=await adminDatabase().from('site_banners').select('*').order('display_order',{ascending:true});if(error)throw error;return apiResponse({banners:data||[]})}catch{return apiResponse({error:'배너를 불러오지 못했어요. 마이그레이션 적용 상태를 확인해주세요.'},503)}
}
export async function POST(request){
 const blocked=authorizeMutation(request);if(blocked)return blocked;
 try{
  const input=await readJson(request,8000);const db=adminDatabase();
  if(input?.action==='reorder'){
   const {data:current,error}=await db.from('site_banners').select('id');if(error)throw error;
   const ids=normalizedOrder(input.ids,(current||[]).map(v=>v.id));
   const {error:reorderError}=await db.rpc('set_site_banner_order',{ordered_ids:ids});if(reorderError)throw reorderError;
   return apiResponse({ok:true});
  }
  const row=validateBanner(input,{allowedImageOrigin:new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin});
  const {count,error:countError}=await db.from('site_banners').select('id',{count:'exact',head:true});if(countError)throw countError;
  if(count>=MAX_BANNERS)return apiResponse({error:'숨긴 배너를 포함해 최대 3개까지 등록할 수 있어요.'},409);
  const {data,error}=await db.from('site_banners').insert({...row,display_order:count+1}).select().single();if(error){if(error.code==='23514')return apiResponse({error:'최대 3개까지만 등록할 수 있어요.'},409);throw error;}
  return apiResponse({banner:data},201);
 }catch(e){return badRequest(e)}
}
