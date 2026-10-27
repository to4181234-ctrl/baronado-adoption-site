import { NextResponse } from 'next/server';
import { adminDatabase } from '../../../../lib/server/adminData.js';
import { authRateLimited, clearGoCookie, goError, goMember, goMutationAllowed, hashSecret, issueGoCookie, nicknameKey, passwordCheck, verifySecret } from '../../../../lib/server/goAuth.js';
import { randomBytes } from 'node:crypto';

export const runtime = 'nodejs';

export async function GET(request) {
  const member = await goMember(request);
  return NextResponse.json({ member }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request) {
  const blocked = goMutationAllowed(request);
  if (blocked) return blocked;
  try {
    if (await authRateLimited(request)) return goError('잠시 후 다시 시도해주세요.', 429);
    const input = await request.json();
    const { nickname, key } = nicknameKey(input.nickname);
    const password = passwordCheck(input.password);
    const db = adminDatabase();
    if (input.action === 'register') {
      const recoveryCode = randomBytes(18).toString('base64url');
      const { data, error } = await db.from('go_members').insert({
        nickname, nickname_key: key,
        password_hash: await hashSecret(password),
        recovery_hash: await hashSecret(recoveryCode)
      }).select('id,nickname').single();
      if (error?.code === '23505') return goError('이미 사용 중인 닉네임이에요.', 409);
      if (error) throw error;
      return issueGoCookie(NextResponse.json({ member: data, recoveryCode }, { status: 201 }), data.id);
    }
    const { data: member, error } = await db.from('go_members').select('id,nickname,password_hash,disabled').eq('nickname_key', key).maybeSingle();
    if (error) throw error;
    if (input.action === 'login') {
      if (!member || member.disabled || !(await verifySecret(password, member.password_hash))) return goError('닉네임 또는 비밀번호를 확인해주세요.', 401);
      return issueGoCookie(NextResponse.json({ member: { id: member.id, nickname: member.nickname } }), member.id);
    }
    if (input.action === 'recover') {
      const code = typeof input.recoveryCode === 'string' ? input.recoveryCode.trim() : '';
      const { data: recovery } = member ? await db.from('go_members').select('recovery_hash').eq('id', member.id).single() : { data: null };
      if (!recovery || !(await verifySecret(code, recovery.recovery_hash))) return goError('닉네임 또는 복구 코드를 확인해주세요.', 401);
      const replacement = randomBytes(18).toString('base64url');
      const { error: updateError } = await db.from('go_members').update({ password_hash: await hashSecret(password), recovery_hash: await hashSecret(replacement) }).eq('id', member.id);
      if (updateError) throw updateError;
      return issueGoCookie(NextResponse.json({ member: { id: member.id, nickname: member.nickname }, recoveryCode: replacement }), member.id);
    }
    return goError('요청을 확인해주세요.');
  } catch (error) {
    if (error instanceof SyntaxError) return goError('입력 형식을 확인해주세요.');
    if (/닉네임|비밀번호는/.test(error.message || '')) return goError(error.message);
    return goError(error.message?.includes('로그인 설정') ? error.message : '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.', 500);
  }
}

export async function DELETE(request) {
  const blocked = goMutationAllowed(request);
  if (blocked) return blocked;
  return clearGoCookie(NextResponse.json({ ok: true }));
}
