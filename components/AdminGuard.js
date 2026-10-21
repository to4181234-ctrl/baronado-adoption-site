'use client';

import { useEffect, useState } from 'react';
import SiteHeader from './SiteHeader';
import DogLoading from './DogLoading';

export default function AdminGuard({ children }) {
  const [status, setStatus] = useState('loading');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/session', { cache: 'no-store', credentials: 'same-origin' })
      .then(async response => {
        if (!response.ok) throw new Error('관리자 연결 상태를 확인할 수 없습니다.');
        return response.json();
      })
      .then(data => {
        if (!active) return;
        setStatus(!data.configured ? 'unconfigured' : data.authenticated ? 'authorized' : 'signed-out');
      })
      .catch(() => {
        if (active) setStatus('unavailable');
      });
    return () => { active = false; };
  }, []);

  const login = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '로그인에 실패했습니다.');
      setPassword('');
      setStatus('authorized');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store'
      });
      if (!response.ok) throw new Error('로그아웃에 실패했습니다.');
      setStatus('signed-out');
      setPassword('');
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (status === 'authorized') {
    return <>
      <div className="admin-session-bar">
        <span>관리자 모드</span>
        <button type="button" onClick={logout} disabled={busy}>로그아웃</button>
      </div>
      {children}
    </>;
  }

  return <main className="site-shell">
    <SiteHeader />
    <section className="container narrow form-container">
      <div className="admin-login-panel">
        <h1>관리자 페이지</h1>
        {status === 'loading' && <DogLoading />}
        {status === 'unconfigured' && <p className="message error">관리자 비밀번호와 서버 키가 아직 설정되지 않았습니다.</p>}
        {status === 'unavailable' && <p className="message error">관리자 인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.</p>}
        {status === 'signed-out' && (
          <form className="form" onSubmit={login}>
            <p className="small-note">공통 비밀번호를 입력하면 게시글을 관리할 수 있습니다.</p>
            <label>
              <span className="label">관리자 비밀번호</span>
              <input className="field" type="password" autoComplete="current-password"
                required minLength={12} maxLength={256}
                value={password} onChange={event => setPassword(event.target.value)}
                placeholder="공통 비밀번호" />
            </label>
            {error && <p className="message error" role="alert">{error}</p>}
            <button className="btn full" type="submit" disabled={busy}>{busy ? '확인 중...' : '관리자 페이지 열기'}</button>
          </form>
        )}
      </div>
    </section>
  </main>;
}
