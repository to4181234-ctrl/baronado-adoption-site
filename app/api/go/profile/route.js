import {adminDatabase} from '../../../../lib/server/adminData.js';
import {goError,goMember,goMutationAllowed,nicknameKey,authRateLimited} from '../../../../lib/server/goAuth.js';
export const runtime='nodejs';
const names=['깡지','버디','뽀실','구름','오레오'];
export async function GET(request){
 const member=await goMember(request);if(!member)return goError('로그인이 필요해요.',401);
 return Response.json({nickname:member.nickname,bio:member.profile_bio||'',avatarDog:member.avatar_dog||null},{headers:{'Cache-Control':'no-store'}});
}
export async function PATCH(request){
 const denied=goMutationAllowed(request);if(denied)return denied;
 const member=await goMember(request);if(!member)return goError('로그인이 필요해요.',401);
 const body=await request.json().catch(()=>null);
 if(!body||Object.keys(body).some(k=>!['bio','avatarDog','nickname'].includes(k)))return goError('프로필 정보를 확인해주세요.');
 const changes={};
 if(Object.hasOwn(body,'nickname')){let nick;try{nick=nicknameKey(body.nickname)}catch(e){return goError(e.message)}if(nick.nickname!==member.nickname){if(await authRateLimited(request,'nickname-edit-'+member.id))return goError('잠시 후 다시 시도해주세요.',429);changes.nickname=nick.nickname;changes.nickname_key=nick.key;}}
 if(Object.hasOwn(body,'bio')){if(typeof body.bio!=='string'||Array.from(body.bio.trim()).length>50)return goError('소개는 50자 이내로 적어주세요.');changes.profile_bio=body.bio.trim();}
 if(Object.hasOwn(body,'avatarDog')){
  if(body.avatarDog!==null&&!names.includes(body.avatarDog))return goError('캐릭터를 확인해주세요.');
  if(body.avatarDog){
   const db=adminDatabase();
   const owned=await db.from('go_cards').select('id,dogs!inner(name)').eq('member_id',member.id).eq('dogs.name',body.avatarDog).eq('status','approved').limit(1);
   if(owned.error||!owned.data?.length)return goError('수집한 강아지만 대표 캐릭터로 설정할 수 있어요.',403);
  }
  changes.avatar_dog=body.avatarDog;
 }
 if(!Object.keys(changes).length)return goError('변경할 내용을 확인해주세요.');
 try{
  const {data,error}=await adminDatabase().from('go_members').update(changes).eq('id',member.id).eq('disabled',false).select('nickname,profile_bio,avatar_dog').single();
  if(error?.code==='23505')return goError('이미 사용 중인 닉네임이에요.',409);if(error)throw error;return Response.json({nickname:data.nickname,bio:data.profile_bio||'',avatarDog:data.avatar_dog||null},{headers:{'Cache-Control':'no-store'}});
 }catch{return goError('프로필을 저장하지 못했어요.',500);}
}
