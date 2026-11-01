import {adminDatabase,validId} from '../../../../../lib/server/adminData.js';
import {authorizeMutation,apiResponse,badRequest,readJson} from '../../../../../lib/server/adminHttp.js';
import {validateBanner} from '../../../../../lib/bannerRules.mjs';
export const runtime='nodejs';
async function guarded(request,context){const denied=authorizeMutation(request);if(denied)return {denied};const {id}=await context.params;if(!validId(id))return {denied:apiResponse({error:'배너 주소를 확인해주세요.'},400)};return {id}}
export async function PATCH(request,context){const {id,denied}=await guarded(request,context);if(denied)return denied;try{const row=validateBanner(await readJson(request,8000),{allowedImageOrigin:new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin});const {data,error}=await adminDatabase().from('site_banners').update(row).eq('id',id).select().maybeSingle();if(error)throw error;if(!data)return apiResponse({error:'배너를 찾지 못했어요.'},404);return apiResponse({banner:data})}catch(e){return badRequest(e)}}
export async function DELETE(request,context){const {id,denied}=await guarded(request,context);if(denied)return denied;try{const {data,error}=await adminDatabase().from('site_banners').delete().eq('id',id).select('id').maybeSingle();if(error)throw error;if(!data)return apiResponse({error:'배너를 찾지 못했어요.'},404);return apiResponse({ok:true})}catch(e){return badRequest(e)}}
