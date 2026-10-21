'use client';

import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import SiteHeader from './SiteHeader';
import DogLoading from './DogLoading';

export default function AdminGuard({ children }) {
  const [status, setStatus] = useState('loading');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setStatus('unconfigured');
      return;
    }

    let active = true;
    const checkAdmin = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !user) {
        setStatus('signed-out');
        return;
      }
      const { data, error } = await supabase
        .from('site_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setMessage('관리자 권한을 확인하지 못했습니다. 설정을 확인해주세요.');
        setStatus('error');
        return;
      }
      setStatus(data ? 'authorized' : 'forbidden');
    };

    checkAdmin();
    return () => { active = false; };
  }, []);

  const signIn = async (event) => {
    event.preventDefault();
    if (!supabase) return;
    setSending(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin + '/admin'
      }
    });
    setSending(false);
    setMessage(error ? '이메일 발송에 실패했습니다. 이메일 주소와 인증 설정을 확인해주세요.' : '메일로 보낸 로그인 링크를 확인해주세요.');
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    setStatus('signed-out');
    setMessage('');
  };

  if (status === 'authorized') return <>{children}</>;

  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="container narrow form-container">
        <div className="page-head"><h1>관리자 로그인</h1></div>
        {status === 'loading' && <DogLoading />}
        {status === 'unconfigured' && <p className="message error">Supabase 연결 설정이 필요합니다.</p>}
        {status === 'signed-out' && (
          <form className="form" onSubmit={signIn}>
            <p className="small-note">관리자에게 허용된 계정으로 이메일 인증 후 이용할 수 있습니다.</p>
            <label>
              <span className="label">이메일 주소</span>
              <input className="field" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com"/>
            </label>
            <button className="btn full" type="submit" disabled={sending}>{sending ? '발송 중...' : '로그인 링크 보내기'}</button>
          </form>
        )}
        {status === 'forbidden' && (
          <div className="form">
            <p className="message error">로그인한 계정에 관리자 권한이 없습니다. 사이트 관리자의 승인이 필요합니다.</p>
            <button className="btn secondary" type="button" onClick={signOut}>다른 계정으로 로그인</button>
          </div>
        )}
        {status === 'error' && <div className="message error">{message}</div>}
        {message && status === 'signed-out' && <p className="small-note" role="status">{message}</p>}
      </section>
    </main>
  );
}
