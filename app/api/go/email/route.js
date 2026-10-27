import { NextResponse } from 'next/server';
import { adminDatabase, validId } from '../../../../lib/server/adminData.js';
import { authRateLimited, goError, goMember, goMutationAllowed, publicMember, verifySecret } from '../../../../lib/server/goAuth.js';
import { clearEmailProof, emailCodeHash, emailReady, issueEmailProof, normalizeEmail, sendEmailCode } from '../../../../lib/server/goEmail.js';
export const runtime='nodejs';
export async function GET(){return Response.json({ready:emailReady()},{headers:{'Cache-Control':'no-store'}});}
export async function POST(request){
 const blocked=goMutationAllowed(request);if(blocked)return blocked;
 try{
  const input=await request.json();
  if(await authRateLimited(request, String(input.email || input.challengeId || '').slice(0,254)))return goError('잠시 후 다시 시도해주세요.',429);
  const member=await goMember(request); const db=adminDatabase();
  if(input.action==='send'){
   const email=normalizeEmail(input.email);
   if(!['register','recover','link'].includes(input.purpose))return goError('인증 목적을 확인해주세요.');
   if(input.purpose==='link'&&!member)return goError('로그인이 필요해요.',401);
   if(input.purpose==='link'){
    const {data:secret}=await db.from('go_members').select('password_hash').eq('id',member.id).single();
    if(!secret||!(await verifySecret(input.currentPassword,secret.password_hash)))return goError('현재 비밀번호를 확인해주세요.',401);
   }
   if(!emailReady())return goError('인증메일 발송 설정이 아직 완료되지 않았어요.',503);
   return Response.json({challengeId:await sendEmailCode(email,input.purpose,member?.id)});
  }
  if(input.action==='verify'){
   if(!validId(input.challengeId)||!/^\d{6}$/.test(input.code||''))return goError('6자리 인증번호를 입력해주세요.');
   const {data,error}=await db.rpc('go_verify_email_code',{p_id:input.challengeId,p_hash:emailCodeHash(input.challengeId,input.code)});
   if(error)throw error;
   if(!data)return goError('인증번호가 다르거나 만료됐어요. 다시 요청해주세요.',401);
   if(data.purpose==='link'){
    if(!member||data.memberId!==member.id)return goError('로그인이 필요해요.',401);
    const result=await db.rpc('go_complete_email_action',{p_challenge:data.id,p_member:member.id,p_nickname:null,p_key:null,p_password_hash:null,p_recovery_hash:null});
    if(result.error?.code==='23505')return goError('이미 다른 계정에 등록된 이메일이에요.',409);
    if(result.error)throw result.error;
    return clearEmailProof(NextResponse.json({verified:true,member:publicMember(result.data)}));
   }
   return issueEmailProof(NextResponse.json({verified:true}),data.id);
  }
  return goError('요청을 확인해주세요.');
 }catch(error){return goError(/이메일|인증번호|인증메일/.test(error.message||'')?error.message:'이메일 인증에 실패했어요.',400);}
}
