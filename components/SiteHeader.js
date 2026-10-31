'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
export default function SiteHeader({member=null,onLogout=null,onLogin=null}){
 const pathname=usePathname()||'/';
 const inGo=pathname.startsWith('/go');
 const inAdmin=pathname.startsWith('/admin');
 const [open,setOpen]=useState(false);
 useEffect(()=>setOpen(false),[pathname]);
 useEffect(()=>{if(!open)return;const prior=document.body.style.overflow;document.body.style.overflow='hidden';const key=e=>{if(e.key==='Escape')setOpen(false);};const back=()=>setOpen(false);window.addEventListener('keydown',key);window.addEventListener('popstate',back);return()=>{document.body.style.overflow=prior;window.removeEventListener('keydown',key);window.removeEventListener('popstate',back);};},[open]);
 const links=inGo?[['/go','내 도감'],['/go/community','모두의 도감'],['/go/guide','게임 안내'],['/','바로나도 홈으로'],['/go/settings','시스템 설정']]:[['/','가족을 찾아요'],['/residents','상주견 소개'],['/go','멍멍GO!']];
 return <header className={'v3-header'+(inGo?' v3-header-go':'')+(inAdmin?' v3-header-admin':'')}>
  <div className="v3-header-inner">
   {inGo?<><button type="button" className="v3-hamburger" onClick={()=>setOpen(value=>!value)} aria-label="멍기록가 메뉴 열기" aria-expanded={open}><span/><span/><span/></button><Link className="v3-go-brand" href="/go">멍멍GO!</Link><div className="v3-header-fill"/>{member?<><span className="v3-member-greet">{member.nickname}님 안녕하세요</span><button className="v3-header-logout" onClick={onLogout}>로그아웃</button></>:<button className="v3-header-logout" onClick={onLogin}>로그인</button>}</>:
   <><Link className="v3-brand" href={inAdmin?'/admin':'/'}>{inAdmin?'바로나도 관리자':'바로나도'}</Link><nav aria-label="주요 메뉴" className="v3-main-nav">{links.map(([href,label])=><Link key={href} href={href} aria-current={pathname===href?'page':undefined}>{label}</Link>)}</nav></>}
  </div>
  {open&&<div className="v3-menu-scrim" onClick={()=>setOpen(false)} role="presentation"><nav className="v3-menu-drawer" aria-label="멍기록가 메뉴" onClick={e=>e.stopPropagation()}><div className="v3-menu-title">멍기록가 메뉴<button type="button" aria-label="메뉴 닫기" onClick={()=>setOpen(false)}>×</button></div>{links.map(([href,label])=><Link href={href} key={href} aria-current={pathname===href?'page':undefined} onClick={()=>setOpen(false)}>{label}</Link>)}</nav></div>}
 </header>;
}
