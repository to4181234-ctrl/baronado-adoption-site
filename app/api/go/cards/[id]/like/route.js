import { adminDatabase, validId } from '../../../../../../lib/server/adminData.js';
import { goError, goMember, goMutationAllowed } from '../../../../../../lib/server/goAuth.js';
export const runtime = 'nodejs';
export async function POST(request, { params }) {
 const blocked=goMutationAllowed(request);if(blocked)return blocked;
 const member=await goMember(request);if(!member)return goError('로그인이 필요해요.',401);
 const {id}=await params;if(!validId(id))return goError('카드를 확인해주세요.');
 const input=await request.json().catch(()=>({}));
 if(input.liked!==undefined&&typeof input.liked!=='boolean')return goError('좋아요 상태를 확인해주세요.');
 const {data,error}=await adminDatabase().rpc('go_set_like',{p_card:id,p_member:member.id,p_liked:input.liked??null});
 if(error)return goError(error.message?.includes('card not public')?'공개된 카드에서만 좋아요를 누를 수 있어요.':'좋아요를 저장하지 못했어요.',error.message?.includes('card not public')?404:500);
 return Response.json(data,{headers:{'Cache-Control':'no-store'}});
}
