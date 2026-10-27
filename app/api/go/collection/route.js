import { adminDatabase,validId } from '../../../../lib/server/adminData.js';
import { goError,goMember,goMutationAllowed } from '../../../../lib/server/goAuth.js';
import { collectionBase,loadCollection } from '../../../../lib/server/goCollection.js';
export const dynamic='force-dynamic';
export async function GET(request){const member=await goMember(request);if(!member)return goError('로그인이 필요해요.',401);try{return Response.json(await loadCollection(member.id),{headers:{'Cache-Control':'no-store'}});}catch{return goError('도감 현황을 불러오지 못했어요.',500);}}
export async function PATCH(request){
 const blocked=goMutationAllowed(request);if(blocked)return blocked;const member=await goMember(request);if(!member)return goError('로그인이 필요해요.',401);
 try{const {dogId,cardId}=await request.json();if(!validId(dogId)||(cardId!==null&&!validId(cardId)))return goError('대표 카드를 확인해주세요.');const {error}=await adminDatabase().rpc('go_set_album_cover',{p_member:member.id,p_dog:dogId,p_card:cardId});if(error)return goError('이 멍멍이의 내 카드만 대표 사진으로 선택할 수 있어요.',400);return Response.json({ok:true});}catch{return goError('대표 카드를 저장하지 못했어요.',500);}
}
export async function POST(request){
 const blocked=goMutationAllowed(request);if(blocked)return blocked;const member=await goMember(request);if(!member)return goError('로그인이 필요해요.',401);
 try{const base=await collectionBase(member.id);if(!base.progress.complete)return goError('현재 만날 수 있는 멍멍이 도감을 모두 모으면 받을 수 있어요.',409);const {error}=await adminDatabase().from('go_collection_badges').upsert({member_id:member.id,roster_key:base.rosterKey,dog_ids:base.ids,dog_count:base.ids.length},{onConflict:'member_id,roster_key',ignoreDuplicates:true});if(error)throw error;return Response.json({ok:true});}catch{return goError('완성 스탬프를 저장하지 못했어요.',500);}
}
