import { randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { adminDatabase } from './adminData.js';
import { scopedSignature } from './goAuth.js';
const PROOF_COOKIE = 'baronado_go_email';
export function emailReady() { return Boolean(process.env.RESEND_API_KEY && process.env.GO_MAIL_FROM); }
export function normalizeEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('이메일 주소를 확인해주세요.');
  return email;
}
export function emailCodeHash(id, code) { return scopedSignature(id + ':' + code, 'email-code'); }
export function issueEmailProof(response, id) {
  const value = id + '.' + (Math.floor(Date.now()/1000)+300);
  response.cookies.set(PROOF_COOKIE, value + '.' + scopedSignature(value, 'email-proof'), { path:'/api/go', httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'strict', maxAge:300 });
  return response;
}
export function clearEmailProof(response) { response.cookies.set(PROOF_COOKIE,'',{path:'/api/go',maxAge:0,httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict'}); return response; }
export function readEmailProof(request) {
  const parts = (request.cookies.get(PROOF_COOKIE)?.value || '').split('.');
  if (parts.length!==3 || !/^[a-f0-9-]{36}$/i.test(parts[0])) return null;
  const exp = Number(parts[1]); const now = Math.floor(Date.now()/1000);
  if (!Number.isSafeInteger(exp)||exp<=now||exp>now+300) return null;
  const actual=Buffer.from(parts[2],'base64url'), expected=Buffer.from(scopedSignature(parts.slice(0,2).join('.'),'email-proof'),'base64url');
  return actual.length===expected.length && timingSafeEqual(actual,expected) ? parts[0] : null;
}
export async function sendEmailCode(email,purpose,memberId) {
  if (!emailReady()) throw new Error('인증메일 발송 설정이 아직 완료되지 않았어요.');
  const db=adminDatabase();
  const { count,error }=await db.from('go_email_challenges').select('*',{count:'exact',head:true}).eq('email',email).gte('created_at',new Date(Date.now()-60000).toISOString());
  if(error) throw error;
  if(count) throw new Error('인증번호는 1분 후 다시 요청할 수 있어요.');
  const id=randomUUID(),code=String(randomInt(0,1000000)).padStart(6,'0');
  const inserted=await db.from('go_email_challenges').insert({id,email,purpose,member_id:memberId||null,token_hash:emailCodeHash(id,code),expires_at:new Date(Date.now()+300000).toISOString()});
  if(inserted.error) throw inserted.error;
  const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`go-otp-${id}`},body:JSON.stringify({from:process.env.GO_MAIL_FROM,to:[email],subject:'멍멍GO! 이메일 인증번호',text:`멍멍GO! 인증번호는 ${code} 입니다. 5분 안에 입력해주세요. 직접 요청하지 않았다면 이 메일을 무시해주세요.`}),signal:AbortSignal.timeout(10000)});
  if(!result.ok){await db.from('go_email_challenges').delete().eq('id',id);throw new Error('인증메일을 보내지 못했어요. 잠시 후 다시 시도해주세요.');}
  // Verification records contain no plaintext codes and expire quickly; purge old records.
  await db.from('go_email_challenges').delete().lt('created_at',new Date(Date.now()-86400000).toISOString());
  return id;
}
