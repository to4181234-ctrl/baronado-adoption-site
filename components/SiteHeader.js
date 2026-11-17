'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useContext,useEffect,useState} from 'react';
import {AdminSessionContext} from './AdminSessionContext.js';
import {useGoCoins} from './GoCoins.js';
export default function SiteHeader({member=null,onLogout=null,onLogin=null}){
 const pathname=usePathname()||'/';
 const adminSession=useContext(AdminSessionContext);
 const coins=useGoCoins();
 const inGo=pathname.startsWith('/go');
 const inAdmin=pathname.startsWith('/admin');
 const [open,setOpen]=useState(false);
 useEffect(()=>setOpen(false),[pathname]);
 useEffect(()=>{if(!open)return;const prior=document.body.style.overflow;document.body.style.overflow='hidden';const key=e=>{if(e.key==='Escape')setOpen(false);};const back=()=>setOpen(false);window.addEventListener('keydown',key);window.addEventListener('popstate',back);return()=>{document.body.style.overflow=prior;window.removeEventListener('keydown',key);window.removeEventListener('popstate',back);};},[open]);
 const links=inGo?[['/go','내 도감'],['/go/community','모두의 도감'],['/go/guide','게임 안내'],['/','바로나도 홈으로'],['/go/settings','시스템 설정']]:[['/','가족을 찾아요'],['/residents','상주견 소개'],['/go','멍멍GO!']];
 return <header className={'v3-header'+(inGo?' v3-header-go s1-go-header':'')+(inAdmin?' v3-header-admin':'')}>
  <div className="v3-header-inner">
   {inGo?<><Link className="s1-go-brand" href="/go">멍멍GO!</Link><div className="s1-header-actions">{coins?.enabled&&member ? <button type="button" className="s1-coin s3-coin-trigger"
 aria-label={!coins.walletLoaded||coins.loading?'멍코인 조회 중':coins.error?'멍코인 조회 오류 · 이용 내역 다시 보기':`멍코인 ${coins.balance}C 이용 내역 보기`}
 onClick={coins.openHistory} disabled={!coins.walletLoaded||Boolean(coins.error)}>{!coins.walletLoaded||coins.error?'—':coins.balance} 멍코인</button>
 :<span className="s1-coin" aria-label="멍코인은 로그인 후 확인할 수 있어요">{member?'—':'0'} 멍코인</span>}<span className="s1-header-divider" aria-hidden="true"/><span className="s1-store" aria-disabled="true" title="스토어는 후속 업데이트에서 열려요">스토어</span></div></>:
   <><Link className="v3-brand" href={inAdmin?'/admin':'/'}>{inAdmin?'바로나도 관리자':<img src="/figma-v3/baronado-wordmark.svg" width="47" height="9" alt="바로나도"/>}</Link>{inAdmin&&adminSession&&<button className="v10-admin-logout" onClick={adminSession.logout} disabled={adminSession.busy}>로그아웃</button>}<nav aria-label="주요 메뉴" className="v3-main-nav">{links.map(([href,label])=><Link key={href} href={href} aria-current={pathname===href?'page':undefined}>{label}</Link>)}</nav></>}
  </div>
  {inGo&&<nav className="s1-go-nav" aria-label="멍멍GO 주요 메뉴">{[['/','바로나도 홈'],['/go','내 도감'],['/go/community','모두의 도감'],['/go/battle','멍배틀'],['/go/settings','설정/게임 안내']].map(([href,label],i)=>{const current=i===1?pathname==='/go'||/^\/go\/[0-9a-f-]{36}$/i.test(pathname):i===2?pathname.startsWith('/go/community')||pathname.startsWith('/go/posts')||pathname.startsWith('/go/recorders'):i===3?pathname.startsWith('/go/battle'):i===4?['/go/settings','/go/guide','/go/profile','/go/avatar','/go/withdraw'].includes(pathname):false;return <Link key={href} href={href} aria-current={current?'page':undefined}>{label}</Link>})}</nav>}
  {open&&<div className="v3-menu-scrim" onClick={()=>setOpen(false)} role="presentation"><nav className="v3-menu-drawer" aria-label="멍기록가 메뉴" onClick={e=>e.stopPropagation()}><div className="v3-menu-title">멍기록가 메뉴<button type="button" aria-label="메뉴 닫기" onClick={()=>setOpen(false)}>×</button></div>{links.map(([href,label])=><Link href={href} key={href} aria-current={pathname===href?'page':undefined} onClick={()=>setOpen(false)}>{label}</Link>)}</nav></div>}
 </header>;
}
