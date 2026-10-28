'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from './SiteHeader.js';
import GoAccount from './GoAccount.js';
const SessionContext = createContext(null);
export const useGoSession = () => useContext(SessionContext);
export default function GoShell({ children, title = '멍멍GO!', description = '나만의 바로나도 멍멍이 카드를 모으고 저장해보세요!', active = 'album', albumDetail = false }) {
  const [member, setMember] = useState(null);
  const [ready, setReady] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [googleMessage,setGoogleMessage]=useState('');
  useEffect(() => { fetch('/api/go/session', { cache: 'no-store' }).then(r => r.json()).then(data => setMember(data.member)).catch(() => {}).finally(() => setReady(true)); }, []);
  useEffect(() => { const result=new URLSearchParams(location.search).get('google'); if(result){setGoogleMessage(result==='error'?'구글 인증이 취소되었거나 만료됐어요. 다시 시도해주세요.':result==='conflict'?'이미 다른 계정에 연결된 구글 계정이에요. 기존 도감을 유지하려면 사용 중인 닉네임 계정에서 연결해주세요.':'');setShowAccount(true);history.replaceState(null,'',location.pathname);} }, []);
  async function logout() { const r = await fetch('/api/go/session', { method: 'DELETE' }); if (r.ok) setMember(null); }
  return <SessionContext.Provider value={{ member, ready, openAccount: () => setShowAccount(true) }}><main className="site-shell"><SiteHeader /><section className="container go-container go-v2">
    <div className="go-topline"><Link href="/" className="go-home">바로나도 홈</Link><div className="go-top-account">{member ? <><button onClick={() => setShowAccount(true)}>{member.nickname}</button><button onClick={logout}>로그아웃</button></> : <button onClick={() => setShowAccount(true)}>멍멍GO! 회원가입/로그인</button>}</div></div>

    {!albumDetail&&<header className="go-heading"><h1>{title==='멍멍GO!'?<img className="go-title-logo" src="/meonggo-reference-logo.svg" alt="멍멍GO!"/>:title}</h1><p>{description}</p>{active!=='community'&&<p className="go-guidance">멍멍이를 쫓거나 놀라게 하지 말고, 플래시 없이 편안한 거리에서 촬영해주세요. 카메라로 현장에서 촬영한 사진만 기록할 수 있어요.</p>}</header>}
    {active==='album'&&!albumDetail&&member&&<div className="go-recorder-identity">
      <p className="go-recorder-name"><strong>{member.nickname}</strong> 멍기록가</p>
      <Link className="go-recorder-shortcut" href={`/go/recorders/${member.id}`} aria-label="내 멍기록가 프로필로 이동">
        <span>내 프로필 보기</span>
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m7 4 6 6-6 6" /></svg>
      </Link>
    </div>}
    <nav className="go-local-nav" aria-label="멍멍GO! 메뉴"><Link aria-current={active === 'album' ? 'page' : undefined} href="/go">나의 멍멍 도감</Link><Link aria-current={active === 'community' ? 'page' : undefined} href="/go/community">모두의 멍멍 도감</Link></nav>
    {children}
  </section>{showAccount && <div className="go-overlay" role="dialog" aria-modal="true" aria-label="멍멍GO! 회원가입/로그인"><div className="go-dialog"><button className="go-close" onClick={() => setShowAccount(false)} aria-label="닫기">×</button><>{googleMessage&&<p className="go-error" role="alert">{googleMessage}</p>}<GoAccount member={member} onChange={value => { setMember(value); setShowAccount(false); }} /></></div></div>}</main></SessionContext.Provider>;
}
