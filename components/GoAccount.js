'use client';

import { useState } from 'react';

export default function GoAccount({ member, onChange }) {
  const [mode, setMode] = useState('login');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/go/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: mode, nickname, password, recoveryCode }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '다시 시도해주세요.');
      setPassword(''); setRecoveryCode('');
      if (result.recoveryCode) setNewCode(result.recoveryCode);
      onChange(result.member, Boolean(result.recoveryCode));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (newCode) return <div className="go-account-box" role="status"><h2>복구 코드를 꼭 보관해주세요</h2><p>비밀번호를 잊었을 때 필요합니다. 화면을 닫으면 다시 볼 수 없어요.</p><code className="go-recovery">{newCode}</code><button className="go-primary" onClick={() => setNewCode('')}>보관했어요</button></div>;
  if (member) return <div className="go-account-inline"><span>🐾 <b>{member.nickname}</b>님의 도감</span><button type="button" onClick={async () => { await fetch('/api/go/session', { method: 'DELETE' }); onChange(null); }}>로그아웃</button></div>;
  return <div className="go-account-box"><h2>{mode === 'register' ? '도감 만들기' : mode === 'recover' ? '비밀번호 다시 만들기' : '내 도감에 로그인'}</h2>
    <form onSubmit={submit} className="go-account-form"><label>닉네임<input required minLength={2} maxLength={14} autoComplete="username" value={nickname} onChange={event => setNickname(event.target.value)} /></label>
      <label>{mode === 'recover' ? '새 비밀번호' : '비밀번호'}<input required minLength={10} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} /></label>
      {mode === 'recover' && <label>복구 코드<input required value={recoveryCode} onChange={event => setRecoveryCode(event.target.value)} /></label>}
      {error && <p className="go-error" role="alert">{error}</p>}
      <button className="go-primary" disabled={busy}>{busy ? '처리 중…' : mode === 'register' ? '닉네임으로 시작' : mode === 'recover' ? '비밀번호 변경' : '로그인'}</button></form>
    <div className="go-account-switch"><button onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }}>{mode === 'register' ? '이미 도감이 있어요' : '처음이에요 · 도감 만들기'}</button><button onClick={() => { setMode(mode === 'recover' ? 'login' : 'recover'); setError(''); }}>{mode === 'recover' ? '로그인으로' : '비밀번호 찾기'}</button></div>
  </div>;
}
