'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import SiteHeader from './SiteHeader.js';
import GoAccount from './GoAccount.js';
import GoAmbientSound from './GoAmbientSound.js';
import GoAuthDialog from './GoAuthDialog.js';
import {AUTH_CONTEXT_KEY,authReturnContext,safeGoReturnPath} from '../lib/goAuthReturn.js';
const SessionContext=createContext(null);
export const useGoSession=()=>useContext(SessionContext);
const explanations={save:['멍카드 이미지를\n저장할까요?','로그인하면 카드 이미지를\n저장하고 공유할 수 있어요.','로그인하고 저장하기'],battle:['내 멍카드로\n대결해볼까요?','로그인하고 내 멍카드로\n배틀을 시작해보세요.','로그인하고 시작하기'],like:['이 카드가\n마음에 드나요?','로그인하면 좋아요를\n남길 수 있어요.','로그인하고 계속하기'],report:['신고를\n접수할까요?','로그인한 뒤 신고 내용을\n작성할 수 있어요.','로그인하고 계속하기']};
export default function GoShell({children,active='album'}){
 const [member,setMember]=useState(null),[ready,setReady]=useState(false),[showAccount,setShowAccount]=useState(false),[reason,setReason]=useState(null),[withdrawIntent,setWithdrawIntent]=useState(false),[googleMessage,setGoogleMessage]=useState('');
 const context=useRef(null);
 const remember=useCallback(()=>{const value={path:safeGoReturnPath(location.pathname+location.search+location.hash),scroll:window.scrollY,at:Date.now()};context.current=value;try{sessionStorage.setItem(AUTH_CONTEXT_KEY,JSON.stringify(value));}catch{}},[]);
 const close=useCallback(()=>{setShowAccount(false);setReason(null);setGoogleMessage('');},[]);
 const openAccount=useCallback((intent)=>{remember();setWithdrawIntent(false);const key=typeof intent==='string'?intent:null;setReason(explanations[key]?key:null);setShowAccount(!explanations[key]);},[remember]);
 const loggedIn=useCallback(value=>{setMember(value);close();try{sessionStorage.removeItem(AUTH_CONTEXT_KEY);}catch{}const saved=context.current;if(saved)requestAnimationFrame(()=>window.scrollTo({top:saved.scroll,behavior:'instant'}));},[close]);
 useEffect(()=>{let mounted=true;fetch('/api/go/session',{cache:'no-store'}).then(r=>r.json()).then(data=>{if(mounted)setMember(data.member||null);}).catch(()=>{}).finally(()=>{if(mounted)setReady(true);});return()=>{mounted=false;};},[]);
 useEffect(()=>{const url=new URL(location.href),result=url.searchParams.get('google');if(!result)return;let saved;try{saved=authReturnContext(JSON.parse(sessionStorage.getItem(AUTH_CONTEXT_KEY)||'null'));}catch{}context.current=saved;url.searchParams.delete('google');history.replaceState(history.state,'',url.pathname+url.search+url.hash);if(saved)requestAnimationFrame(()=>window.scrollTo({top:saved.scroll,behavior:'instant'}));if(result==='success'||result==='linked'){try{sessionStorage.removeItem(AUTH_CONTEXT_KEY);}catch{}return;}setGoogleMessage(result==='error'?'구글 인증이 취소되었거나 만료됐어요. 다시 시도해주세요.':result==='conflict'?'이미 다른 계정에 연결된 구글 계정이에요. 기존 계정에서 연결해주세요.':'');setWithdrawIntent(result==='withdraw');setShowAccount(true);},[]);
 async function logout(){const r=await fetch('/api/go/session',{method:'DELETE'});if(r.ok){try{for(const k of Object.keys(sessionStorage))if(/^(meonggo|baronado-go)/.test(k))sessionStorage.removeItem(k);}catch{}setMember(null);location.assign('/go');}}
 const copy=explanations[reason];
 return <SessionContext.Provider value={{member,ready,openAccount,openWithdraw:()=>{remember();setWithdrawIntent(true);setShowAccount(true);},logout}}>
  <main className="site-shell v3-site v3-go-site s1-go-site">
   <SiteHeader member={member} onLogout={logout} onLogin={()=>openAccount()}/><GoAmbientSound/>
   <section className="v3-go-app">
    {active==='community'&&<header className="v3-community-heading"><h1>모두의 도감</h1><p>멍기록가님의 수집 기록을 함께 나눠보세요</p></header>}
    {children}
   </section>
   {copy&&<GoAuthDialog onClose={close} className="s1-login-prompt" label="로그인 안내"><h2>{copy[0]}</h2><p>{copy[1]}</p><button type="button" className="s1-prompt-primary" onClick={()=>{setReason(null);setShowAccount(true);}}>{copy[2]}</button><button type="button" className="s1-prompt-browse" onClick={close}>계속 둘러보기</button></GoAuthDialog>}
   {showAccount&&<GoAuthDialog onClose={close} className="v3-auth s1-account-dialog" label="멍멍GO! 가입·로그인">{googleMessage&&<p className="v3-error" role="alert">{googleMessage}</p>}<GoAccount member={member} initialWithdraw={withdrawIntent} onChange={loggedIn}/></GoAuthDialog>}
  </main>
 </SessionContext.Provider>;
}
