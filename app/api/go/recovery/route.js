import { NextResponse } from 'next/server';
import { adminDatabase } from '../../../../lib/server/adminData.js';
import { authRateLimited, goError, goMutationAllowed, hashSecret, issueGoCookie, nicknameKey, passwordCheck, publicMember, verifySecret } from '../../../../lib/server/goAuth.js';
import { recoveryAnswer } from '../../../../lib/goRecoveryQuestions.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { key } = nicknameKey(new URL(request.url).searchParams.get('nickname'));
    if (await authRateLimited(request, 'recovery:' + key)) return goError('잠시 후 다시 시도해주세요.', 429);
    const { data, error } = await adminDatabase().from('go_members')
      .select('recovery_question,disabled').eq('nickname_key', key).maybeSingle();
    if (error) throw error;
    if (!data || data.disabled || !data.recovery_question) {
      return goError('설정된 복구 질문이 없어요. 구글 로그인이 가능하다면 구글로 로그인해주세요.', 404);
    }
    return NextResponse.json({ question: data.recovery_question }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return goError(/닉네임/.test(error.message || '') ? error.message : '복구 질문을 확인하지 못했어요.');
  }
}

export async function POST(request) {
  const blocked = goMutationAllowed(request);
  if (blocked) return blocked;
  try {
    const input = await request.json();
    const { key } = nicknameKey(input.nickname);
    if (await authRateLimited(request, 'recovery:' + key)) return goError('잠시 후 다시 시도해주세요.', 429);
    const answer = recoveryAnswer(input.answer);
    const password = passwordCheck(input.password);
    const db = adminDatabase();
    const { data: member, error } = await db.from('go_members')
      .select('id,nickname,email,google_sub,disabled,session_version,recovery_question,recovery_answer_hash')
      .eq('nickname_key', key).maybeSingle();
    if (error) throw error;
    if (!member || member.disabled || !member.recovery_question ||
        !(await verifySecret(answer, member.recovery_answer_hash))) {
      return goError('닉네임 또는 본인 확인 답변이 일치하지 않아요.', 401);
    }
    const { data: updated, error: updateError } = await db.from('go_members')
      .update({ password_hash: await hashSecret(password), session_version: member.session_version + 1 })
      .eq('id', member.id).eq('session_version', member.session_version)
      .select('id,nickname,email,google_sub,session_version,recovery_question').single();
    if (updateError || !updated) return goError('다시 시도해주세요.', 409);
    return issueGoCookie(NextResponse.json({ member: publicMember(updated) }), updated.id, updated.session_version);
  } catch (error) {
    if (/닉네임|비밀번호는|본인 확인 답변/.test(error.message || '')) return goError(error.message);
    return goError('비밀번호를 재설정하지 못했어요.', 500);
  }
}
