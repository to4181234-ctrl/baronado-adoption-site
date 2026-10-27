import { NextResponse } from 'next/server';
import { adminDatabase } from '../../../../lib/server/adminData.js';
import { clearGoCookie,goMember,goError,goMutationAllowed,verifySecret,authRateLimited } from '../../../../lib/server/goAuth.js';
import { GOOGLE_DELETE,GOOGLE_JOIN,GOOGLE_FLOW,unpackGoogle,googleCookie } from '../../../../lib/server/goGoogle.js';
export const runtime='nodejs';
export async function DELETE(request){const blocked=goMutationAllowed(request);if(blocked)return blocked;try{const member=await goMember(request);if(!member)return goError('로그인이 필요해요.',401);if(await authRateLimited(request,'withdraw-'+member.id))return goError('잠시 후 다시 시도해주세요.',429);const input=await request.json();if(input.nickname!==member.nickname)return goError('내 닉네임을 정확히 입력해주세요.');const db=adminDatabase();if(member.google_sub){const proof=unpackGoogle(request.cookies.get(GOOGLE_DELETE)?.value,'google-delete');if(!proof||proof.memberId!==member.id||proof.sub!==member.google_sub||proof.version!==member.session_version)return goError('구글로 다시 본인 확인해주세요.',401);}else{const {data,error}=await db.from('go_members').select('password_hash').eq('id',member.id).single();if(error||!await verifySecret(input.password,data?.password_hash))return goError('현재 비밀번호를 확인해주세요.',401);}
const {data:cards,error:readError}=await db.from('go_cards').select('image_path').eq('member_id',member.id);if(readError)throw readError;
// Remove private photos first; if storage fails, leave the account available for a retry.
for(let i=0;i<cards.length;i+=100){const {error}=await db.storage.from('go-cards').remove(cards.slice(i,i+100).map(c=>c.image_path));if(error)return goError('사진 삭제를 완료하지 못했어요. 잠시 후 다시 시도해주세요.',503);}
const {error}=await db.from('go_members').delete().eq('id',member.id).eq('session_version',member.session_version).select('id').single();if(error)throw error;let response=clearGoCookie(NextResponse.json({ok:true}));for(const name of [GOOGLE_DELETE,GOOGLE_JOIN,GOOGLE_FLOW])response=googleCookie(response,name,'');return response;
}catch{return goError('탈퇴를 완료하지 못했어요. 다시 시도해주세요.',500);}}
