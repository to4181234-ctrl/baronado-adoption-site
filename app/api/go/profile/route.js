import {adminDatabase} from '../../../../lib/server/adminData.js';
import {goError,goMember,goMutationAllowed} from '../../../../lib/server/goAuth.js';
export const runtime='nodejs';
export async function PATCH(request){
 const blocked=goMutationAllowed(request);if(blocked)return blocked;const member=await goMember(request);if(!member)return goError('로그인이 필요해요.',401);
 const body=await request.json().catch(()=>null);if(!body||Object.keys(body).some(key=>key!=='bio')||typeof body.bio!=='string'||Array.from(body.bio.trim()).length>100)return goError('소개는 100자 이내로 적어주세요.');
 try{const {data,error}=await adminDatabase().from('go_members').update({profile_bio:body.bio.trim()}).eq('id',member.id).eq('disabled',false).select('profile_bio').maybeSingle();if(error||!data)return goError('소개가 실제로 저장되지 않았어요. 다시 로그인한 뒤 시도해주세요.',409);return Response.json({bio:data.profile_bio},{headers:{'Cache-Control':'no-store'}});}catch{return goError('소개를 저장하지 못했어요.',500);}
}
