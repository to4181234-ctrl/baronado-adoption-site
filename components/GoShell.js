'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from './SiteHeader.js';
import GoAccount from './GoAccount.js';
const SessionContext = createContext(null);
export const useGoSession = () => useContext(SessionContext);
export default function GoShell({ children, title = '멍멍GO', description = '나만의 바로나도 멍멍이 카드를 모으고 저장해보세요!', active = 'album' }) {
  const [member, setMember] = useState(null);
  const [ready, setReady] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  useEffect(() => { fetch('/api/go/session', { cache: 'no-store' }).then(r => r.json()).then(data => setMember(data.member)).catch(() => {}).finally(() => setReady(true)); }, []);
  async function logout() { const r = await fetch('/api/go/session', { method: 'DELETE' }); if (r.ok) setMember(null); }
  return <SessionContext.Provider value={{ member, ready, openAccount: () => setShowAccount(true) }}><main className="site-shell"><SiteHeader /><section className="container go-container go-v2">
    <div className="go-topline"><Link href="/" className="go-home">바로나도 홈</Link><div className="go-top-account">{member ? <><button onClick={() => setShowAccount(true)}>{member.nickname}</button><button onClick={logout}>로그아웃</button></> : <button onClick={() => setShowAccount(true)}>멍멍GO 회원가입/로그인</button>}</div></div>
    <nav className="go-local-nav" aria-label="멍멍GO 메뉴"><Link aria-current={active === 'album' ? 'page' : undefined} href="/go">멍멍 도감</Link><Link aria-current={active === 'community' ? 'page' : undefined} href="/go/community">모두의 도감</Link></nav>
    <header className="go-heading"><h1>{title}</h1><p>{description}</p><p className="go-guidance">멍멍이를 쫓거나 놀라게 하지 말고, 플래시 없이 편안한 거리에서 촬영해주세요. 카메라로 현장에서 촬영한 사진만 기록할 수 있어요.</p></header>
    {children}
  </section>{showAccount && <div className="go-overlay" role="dialog" aria-modal="true" aria-label="멍멍GO 회원가입/로그인"><div className="go-dialog"><button className="go-close" onClick={() => setShowAccount(false)} aria-label="닫기">×</button><GoAccount member={member} onChange={value => { setMember(value); setShowAccount(false); }} /></div></div>}</main></SessionContext.Provider>;
}
