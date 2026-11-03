'use client';
import { useState } from 'react';
import { RECOVERY_QUESTIONS } from '../lib/goRecoveryQuestions.js';

async function sendJson(url, body) {
  const response = await fetch(url, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || '요청을 처리하지 못했어요.');
  return data;
}

export default function GoLocalAccount({ member, onChange }) {
  const [mode, setMode] = useState('login');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [question, setQuestion] = useState(RECOVERY_QUESTIONS[0]);
  const [answer, setAnswer] = useState('');
  const [recoveryQuestion, setRecoveryQuestion] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [configuring, setConfiguring] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  function chooseMode(next) {
    setMode(next); setMessage(''); setPassword(''); setAnswer('');
    setRecoveryQuestion(''); setNewPassword('');
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      if (member) {
        const result = await sendJson('/api/go/session', {
          action: 'setup-local', password, currentPassword, question, answer
        });
        setPassword(''); setCurrentPassword(''); setAnswer(''); setConfiguring(false);
        onChange(result.member);
        return;
      }
      if (mode === 'recover') {
        if (!recoveryQuestion) {
          const response = await fetch('/api/go/recovery?nickname=' + encodeURIComponent(nickname.trim()), {
            cache: 'no-store', credentials: 'same-origin'
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || '복구 질문을 확인하지 못했어요.');
          setRecoveryQuestion(result.question);
          return;
        }
        const result = await sendJson('/api/go/recovery', {
          nickname, answer, password: newPassword
        });
        onChange(result.member);
        return;
      }
      const result = await sendJson('/api/go/session', {
        action: mode === 'register' ? 'register' : 'login',
        nickname, password, ...(mode === 'register' ? { question, answer } : {})
      });
      onChange(result.member);
    } catch (error) {
      setMessage(error.message || '다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  }

  if (member) return <section className="go-local-account">
    <button type="button" className="go-text-button" onClick={() => {
      setConfiguring(value => !value); setMessage('');
    }}>{member.hasRecoveryQuestion ? '비밀번호·복구 질문 변경' : '닉네임 로그인·복구 질문 설정'}</button>
    {configuring && <form className="go-account-form" onSubmit={submit}>
      <p className="go-note">닉네임과 비밀번호로도 로그인하고, 비밀번호 분실 시 질문으로 복구할 수 있어요.</p>
      {!member.googleLinked && <label>현재 비밀번호
        <input type="password" autoComplete="current-password" minLength={4} required
          value={currentPassword} onChange={event => setCurrentPassword(event.target.value)}/>
      </label>}
      <label>새 비밀번호 (4자 이상)
        <input type="password" autoComplete="new-password" minLength={4} maxLength={128} required
          value={password} onChange={event => setPassword(event.target.value)}/>
      </label>
      <label>본인 확인 질문
        <select required value={question} onChange={event => setQuestion(event.target.value)}>
          {RECOVERY_QUESTIONS.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>본인 확인 답변
        <input type="text" autoComplete="off" minLength={2} maxLength={80} required
          value={answer} onChange={event => setAnswer(event.target.value)}/>
      </label>
      <p className="go-note">답변은 남들이 모르는 내용으로 정해주세요. 구글 연결과 기존 도감은 유지돼요.</p>
      <button type="submit" className="go-primary" disabled={busy}>{busy ? '저장 중…' : '로그인 설정 저장'}</button>
    </form>}
    {message && <p className="go-note" role="status">{message}</p>}
  </section>;

  return <section className="go-local-account">
    <div className="go-local-tabs" role="tablist" aria-label="계정 이용 방식">
      <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => chooseMode('login')}>로그인</button>
      <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => chooseMode('register')}>회원가입</button>
      <button type="button" role="tab" aria-selected={mode === 'recover'} onClick={() => chooseMode('recover')}>비밀번호 찾기</button>
    </div>
    <form className="go-account-form" onSubmit={submit}>
      <label>닉네임
        <input type="text" autoComplete="username" minLength={2} maxLength={8} required
          value={nickname} onChange={event => {setNickname(event.target.value);setRecoveryQuestion('');}}
          placeholder="2~8자 닉네임"/>
      </label>
      {mode !== 'recover' && <label>비밀번호
        <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          minLength={4} maxLength={128} required value={password} onChange={event => setPassword(event.target.value)}
          placeholder="4자 이상"/>
      </label>}
      {mode === 'register' && <>
        <label>본인 확인 질문
          <select required value={question} onChange={event => setQuestion(event.target.value)}>
            {RECOVERY_QUESTIONS.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>본인 확인 답변
          <input type="text" autoComplete="off" minLength={2} maxLength={80} required
            value={answer} onChange={event => setAnswer(event.target.value)} placeholder="다른 사람이 모르는 답변"/>
        </label>
        <p className="go-note">이메일 인증 없이 가입해요. 답변을 잊으면 구글 계정이 연결되지 않은 경우 복구할 수 없어요.</p>
      </>}
      {mode === 'recover' && recoveryQuestion && <>
        <p className="go-note">가입할 때 설정한 질문에 답해주세요.</p>
        <label>본인 확인 질문
          <input type="text" readOnly value={recoveryQuestion}/>
        </label>
        <label>답변
          <input type="text" autoComplete="off" minLength={2} maxLength={80} required
            value={answer} onChange={event => setAnswer(event.target.value)}/>
        </label>
        <label>새 비밀번호 (4자 이상)
          <input type="password" autoComplete="new-password" minLength={4} maxLength={128} required
            value={newPassword} onChange={event => setNewPassword(event.target.value)}/>
        </label>
      </>}
      {mode === 'recover' && !recoveryQuestion && <p className="go-note">닉네임을 입력하면 가입 시 선택한 질문을 보여드려요.</p>}
      <button className="go-primary" type="submit" disabled={busy}>
        {busy ? '처리 중…' : mode === 'register' ? '회원가입 완료' : mode === 'recover' ? (recoveryQuestion ? '비밀번호 재설정' : '복구 질문 확인') : '로그인'}
      </button>
    </form>
    {message && <p className="go-note" role="status">{message}</p>}
  </section>;
}
