'use client';
import Link from 'next/link';
import {AdminSessionContext} from './AdminSessionContext.js';

import { useEffect, useState } from 'react';
import SiteHeader from './SiteHeader';
import DogLoading from './DogLoading';

export default function AdminGuard({ children }) {
  const [status, setStatus] = useState('loading');
  const [setupProblems, setSetupProblems] = useState([]);
  const [password, setPassword] = useState('');
  const [authMode,setAuthMode]=useState('member');
  const [passwordlessPreview,setPasswordlessPreview]=useState(false);
  const [noLoginRequired,setNoLoginRequired]=useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const check=()=>fetch('/api/admin/session', { cache: 'no-store', credentials: 'same-origin' })
      .then(async response => {
        if (!response.ok) throw new Error('관리자 연결 상태를 확인할 수 없습니다.');
        return response.json();
      })
      .then(data => {
        if (!active) return;
        setSetupProblems(Array.isArray(data.setupProblems) ? data.setupProblems : []);
        setPasswordlessPreview(Boolean(data.passwordlessPreview));
        setNoLoginRequired(Boolean(data.noLoginRequired));
        setAuthMode(data.authMode||'member');
        setStatus(!data.configured ? 'unconfigured' : data.authenticated ? 'authorized' : data.authMode==='member'&&data.signedIn ? 'forbidden' : 'signed-out');
      })
      .catch(() => {
        if (active) setStatus('unavailable');
      });
    check();
    window.addEventListener('focus',check);
    return () => { active = false;window.removeEventListener('focus',check); };
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
    return <AdminSessionContext.Provider value={{logout:passwordlessPreview||noLoginRequired?null:logout,busy,passwordlessPreview:passwordlessPreview||noLoginRequired}}>{children}</AdminSessionContext.Provider>;
  }

  return <main className="site-shell v3-site v3-admin-login-site">
    <SiteHeader />
    <section className="container narrow form-container">
      <div className="admin-login-panel">
        <div className="v3-admin-login-banner"><h1>관리자 로그인</h1><p>{authMode==='member'?'멍멍GO 관리자 계정으로 이용해주세요.':authMode==='shared_link'?'관리자 서버 설정을 확인해주세요.':'관리자 비밀번호로 로그인해 주세요.'}</p></div>
        {status === 'loading' && <DogLoading />}
        {status === 'unconfigured' && <div className="message error" role="alert">
          <p>관리자 서버 설정을 확인해야 합니다.</p>
          {setupProblems.length > 0 ? <ul>{setupProblems.map(item => <li key={item}>{item}</li>)}</ul>
            : <p>관리자 계정과 서버 연결 설정을 확인해주세요.</p>}
          <p>Vercel에서 환경 변수를 수정한 뒤 미리보기 배포를 다시 실행해야 적용됩니다.</p>
        </div>}
        {status === 'unavailable' && <p className="message error">관리자 인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.</p>}
        {authMode==='member'&&(status==='signed-out'||status==='forbidden')&&<div className="form">
          <p className="small-note">{status==='forbidden'?'이 계정에는 관리자 권한이 없어요.':'멍멍GO에서 로그인한 뒤 이 페이지로 돌아와주세요. 추가 관리자 비밀번호는 필요하지 않아요.'}</p>
          <Link className="btn full" href="/go">{status==='forbidden'?'멍멍GO로 돌아가기':'멍멍GO에서 로그인하기'}</Link>
        </div>}
        {status === 'signed-out' && authMode==='password' && (
          <form className="form" onSubmit={login}>
            <p className="small-note">게시물과 사이트 설정을 관리하는 공간이에요.</p>
            <label>
              <span className="label">관리자 비밀번호</span>
              <input className="field" type="password" autoComplete="current-password"
                required minLength={4} maxLength={256}
                value={password} onChange={event => setPassword(event.target.value)}
                placeholder="비밀번호 입력" />
            </label>
            {error && <p className="message error" role="alert">{error}</p>}
            <button className="btn full" type="submit" disabled={busy}>{busy ? '확인 중...' : '로그인'}</button>
          </form>
        )}
      </div>
    </section>
  </main>;
}
