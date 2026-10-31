'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import Link from 'next/link';
import SiteHeader from './SiteHeader.js';
import GoAccount from './GoAccount.js';
import GoAmbientSound from './GoAmbientSound.js';
const SessionContext=createContext(null);
export const useGoSession=()=>useContext(SessionContext);
export default function GoShell({children,title='멍멍GO!',description='',active='album',albumDetail=false}){
 const [member,setMember]=useState(null),[ready,setReady]=useState(false),[showAccount,setShowAccount]=useState(false),[googleMessage,setGoogleMessage]=useState('');
 useEffect(()=>{let mounted=true;fetch('/api/go/session',{cache:'no-store'}).then(r=>r.json()).then(data=>{if(mounted)setMember(data.member||null);}).catch(()=>{}).finally(()=>{if(mounted)setReady(true);});return()=>{mounted=false;};},[]);
 useEffect(()=>{const result=new URLSearchParams(location.search).get('google');if(result){setGoogleMessage(result==='error'?'구글 인증이 취소되었거나 만료됐어요. 다시 시도해주세요.':result==='conflict'?'이미 다른 계정에 연결된 구글 계정이에요. 기존 계정에서 연결해주세요.':'');setShowAccount(true);history.replaceState(null,'',location.pathname);}},[]);
 async function logout(){const r=await fetch('/api/go/session',{method:'DELETE'});if(r.ok){setMember(null);location.assign('/go');}}
 return <SessionContext.Provider value={{member,ready,openAccount:()=>setShowAccount(true),logout}}>
  <main className="site-shell v3-site v3-go-site">
   <SiteHeader member={member} onLogout={logout} onLogin={()=>setShowAccount(true)}/><GoAmbientSound/>
   <section className="v3-go-app">
    {active==='community'&&<header className="v3-community-heading"><h1>모두의 도감</h1><p>멍기록가님의 수집 기록을 함께 나눠보세요</p></header>}
    {children}
   </section>
   {showAccount&&<div className="v3-auth-backdrop" role="presentation" onClick={()=>setShowAccount(false)}><section className="v3-auth" role="dialog" aria-modal="true" aria-label="멍멍GO! 가입·로그인" onClick={e=>e.stopPropagation()}><button className="v3-auth-close" aria-label="닫기" onClick={()=>setShowAccount(false)}>×</button>{googleMessage&&<p className="v3-error">{googleMessage}</p>}<GoAccount member={member} onChange={value=>{setMember(value);setShowAccount(false);}}/></section></div>}
  </main>
 </SessionContext.Provider>;
}
