import { adminDatabase,validId } from '../../../../lib/server/adminData.js';
import { goError,goMember,goMutationAllowed } from '../../../../lib/server/goAuth.js';
import { loadCollection } from '../../../../lib/server/goCollection.js';
export const dynamic='force-dynamic';
export async function GET(request){const member=await goMember(request);if(!member)return goError('로그인이 필요해요.',401);const dogId=new URL(request.url).searchParams.get('dog');if(dogId&&!validId(dogId))return goError('도감을 확인해주세요.');try{return Response.json(await loadCollection(member.id,dogId),{headers:{'Cache-Control':'no-store'}});}catch{return goError('도감 현황을 불러오지 못했어요.',500);}}
export async function PATCH(request){
 const blocked=goMutationAllowed(request);if(blocked)return blocked;const member=await goMember(request);if(!member)return goError('로그인이 필요해요.',401);
 try{const {dogId,cardId}=await request.json();if(!validId(dogId)||(cardId!==null&&!validId(cardId)))return goError('대표 카드를 확인해주세요.');const {error}=await adminDatabase().rpc('go_set_album_cover',{p_member:member.id,p_dog:dogId,p_card:cardId});if(error)return goError('이 멍멍이의 내 카드만 대표 사진으로 선택할 수 있어요.',400);return Response.json({ok:true});}catch{return goError('대표 카드를 저장하지 못했어요.',500);}
}
