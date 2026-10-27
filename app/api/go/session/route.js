import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { adminDatabase } from '../../../../lib/server/adminData.js';
import { authRateLimited, clearGoCookie, goError, goMember, goMutationAllowed, hashSecret, issueGoCookie, nicknameKey, passwordCheck, publicMember, verifySecret } from '../../../../lib/server/goAuth.js';
import { clearEmailProof, readEmailProof } from '../../../../lib/server/goEmail.js';
export const runtime='nodejs';
export async function GET(request){return NextResponse.json({member:publicMember(await goMember(request))},{headers:{'Cache-Control':'no-store'}});}
export async function POST(request){
 const blocked=goMutationAllowed(request);if(blocked)return blocked;
 try{
  const input=await request.json();
  if(await authRateLimited(request,String(input.nickname||'').toLowerCase()))return goError('잠시 후 다시 시도해주세요.',429);
  const password=passwordCheck(input.password),db=adminDatabase();
  if(input.action==='login'){
   const {key}=nicknameKey(input.nickname);
   const {data:member,error}=await db.from('go_members').select('id,nickname,email,password_hash,disabled,session_version').eq('nickname_key',key).maybeSingle();if(error)throw error;
   if(!member||member.disabled||!(await verifySecret(password,member.password_hash)))return goError('닉네임 또는 비밀번호를 확인해주세요.',401);
   return issueGoCookie(NextResponse.json({member:publicMember(member)}),member.id,member.session_version);
  }
  if(['register','recover'].includes(input.action)){
   const challengeId=readEmailProof(request);if(!challengeId)return goError('이메일 인증을 먼저 완료해주세요.',401);
   const {data:challenge}=await db.from('go_email_challenges').select('purpose').eq('id',challengeId).maybeSingle();
   if(challenge?.purpose!==input.action)return goError('이메일 인증을 다시 진행해주세요.',401);
   const nick=input.action==='register'?nicknameKey(input.nickname):null;
   const {data,error}=await db.rpc('go_complete_email_action',{p_challenge:challengeId,p_member:null,p_nickname:nick?.nickname||null,p_key:nick?.key||null,p_password_hash:await hashSecret(password),p_recovery_hash:input.action==='register'?await hashSecret(randomBytes(24).toString('base64url')):null});
   if(error?.code==='23505')return goError('이미 사용 중인 닉네임 또는 이메일이에요.',409);
   if(error)return goError('연결된 계정이 없거나 인증이 만료됐어요. 이메일을 확인하고 다시 인증해주세요.',401);
   return clearEmailProof(issueGoCookie(NextResponse.json({member:publicMember(data)}),data.id,data.session_version));
  }
  return goError('요청을 확인해주세요.');
 }catch(error){if(/닉네임|비밀번호는/.test(error.message||''))return goError(error.message);return goError('요청을 처리하지 못했어요.',500);}
}
export async function DELETE(request){const blocked=goMutationAllowed(request);if(blocked)return blocked;return clearEmailProof(clearGoCookie(NextResponse.json({ok:true})));}
