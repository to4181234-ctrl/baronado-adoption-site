'use client';
import {useEffect,useRef,useState} from 'react';
import {useParams,useRouter} from 'next/navigation';
import {fetchDog} from '../lib/dogs.js';
import {figmaSprite} from '../lib/goV3Game.js';
import {createGameAudio,GAME_SOUND_KEY} from '../lib/goV3Audio.js';
import GoShell,{useGoSession} from './GoShell.js';
const MOTIONS={snack:{name:'간식',pose:'feed',message:'냠냠! 맛있는 간식 고마워~',audio:'snack'},praise:{name:'칭찬',pose:'praise',message:'멍멍! 칭찬해줘서 신나요!',audio:'praise'},play:{name:'놀이',pose:'play',message:'같이 노니까 너무 신나요!',audio:'play'}};
function Interaction(){
 const {id}=useParams(),router=useRouter(),{member,ready,openAccount}=useGoSession();
 const [dog,setDog]=useState(null),[status,setStatus]=useState(null),[pose,setPose]=useState('front'),[notice,setNotice]=useState('멍멍!\n(안녕! 자는게 아니라\n생각중이었어~)'),[visibleNotice,setVisibleNotice]=useState(''),[walking,setWalking]=useState(false),[busy,setBusy]=useState(false),[now,setNow]=useState(Date.now()),[sound,setSound]=useState(true),[error,setError]=useState('');
 const audio=useRef(null),timer=useRef(null),barks=useRef(0),typeTimer=useRef(null);
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id);},[]);
 function remainingLabel(action){
  const state=status?.actions?.[action];
  if(!state)return '2/2';
  if(state.remaining<=0)return '내일 00:00';
  const until=state.nextAt?Date.parse(state.nextAt)-now:0;
  if(Number.isFinite(until)&&until>0){
   const sec=Math.ceil(until/1000);
   return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');
  }
  return state.remaining+'/2';
 }
 function actionBlocked(action){
  const state=status?.actions?.[action];
  return busy||!member||!status?.owned||!state?.remaining||Boolean(state.nextAt&&Date.parse(state.nextAt)>now);
 }
 // Current Figma 173:3556/3634: a five-second quiet period triggers a short side walk.
 useEffect(()=>{
  if(busy||pose!=='front'||typeof document==='undefined'||document.hidden)return;
  const id=setTimeout(()=>{setPose('side');setWalking(true);},5000);
  return()=>clearTimeout(id);
 },[busy,pose,notice]);
 useEffect(()=>{
  if(!walking)return;
  const id=setTimeout(()=>{setWalking(false);setPose('front');},2000);
  return()=>clearTimeout(id);
 },[walking]);
 // Pixel dialogue reveals over <=1s, without added typing sound.
 useEffect(()=>{
  clearInterval(typeTimer.current);
  const message=notice||'';
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setVisibleNotice(message);return;}
  setVisibleNotice('');
  let step=0;const chunk=Math.max(1,Math.ceil(message.length/25));
  typeTimer.current=setInterval(()=>{step+=chunk;setVisibleNotice(message.slice(0,step));if(step>=message.length)clearInterval(typeTimer.current);},40);
  return()=>clearInterval(typeTimer.current);
 },[notice]);
 useEffect(()=>{fetchDog(id).then(setDog).catch(()=>setError('강아지 정보를 불러오지 못했어요.'));},[id]);
 useEffect(()=>{if(!ready||!member)return;fetch('/api/go/interaction?dogId='+encodeURIComponent(id)).then(r=>r.json()).then(setStatus).catch(()=>setError('친밀도를 불러오지 못했어요.'));},[id,ready,member?.id]);
 useEffect(()=>{audio.current=createGameAudio();setSound(localStorage.getItem(GAME_SOUND_KEY)!=='off');const hide=()=>{if(document.hidden)audio.current?.stop()};document.addEventListener('visibilitychange',hide);return()=>{clearTimeout(timer.current);clearInterval(typeTimer.current);audio.current?.dispose();document.removeEventListener('visibilitychange',hide);};},[]);
 function soundToggle(){const next=!sound;setSound(next);localStorage.setItem(GAME_SOUND_KEY,next?'on':'off');window.dispatchEvent(new Event('go-v3-settings-changed'));if(!next)audio.current?.stop();}
 function bark(){if(busy)return;setWalking(false);setPose('front');barks.current=(barks.current+1)%3;audio.current?.play('bark'+(barks.current+1));setNotice(dog?.name+'가 반갑게 짖었어요!');}
 async function interact(action){
  if(busy)return;
  if(!member){openAccount();return;}
  if(!status?.owned){setError('먼저 '+dog?.name+'의 멍카드를 수집해주세요.');return;}
  if(!status?.actions?.[action]?.remaining){setError('오늘 사용할 수 있는 횟수가 없어요.');return;}
  if(status?.actions?.[action]?.nextAt&&Date.now()<Date.parse(status.actions[action].nextAt)){setError('30분 뒤에 다시 이용할 수 있어요.');return;}
  setBusy(true);setWalking(false);setPose('front');setError('');
  try{const r=await fetch('/api/go/interaction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dogId:id,action})});const d=await r.json();if(!r.ok)throw Error(d.error||'교감에 실패했어요.');
   const m=MOTIONS[action];setPose(m.pose);setNotice(m.message);audio.current?.play(m.audio);
   setStatus(old=>({...old,level:d.level,actions:{...old.actions,[action]:{remaining:d.remaining,nextAt:d.availableAt}}}));
   timer.current=setTimeout(()=>{setPose('front');setBusy(false);},2000);
  }catch(e){setError(e.message);setBusy(false);}
 }
 return <div className="v3-interact v3-interact-figma">
  <div className="v3-interact-affinity">친밀도 <b>{status?.level||0} / 10</b></div>
  <button className="v3-interact-sound" aria-label={sound?'소리 끄기':'소리 켜기'} onClick={soundToggle}><img src={'/figma-v3/sound-'+(sound?'on':'off')+'.png'} alt=""/></button>
  <button className="v3-interact-close" aria-label="교감 닫기" onClick={()=>router.push('/go/'+id)}>×</button>
  <div className="v3-interact-machine">
   {['body-border','body-white','bezel-border','bezel-gray','screen-border','screen-white'].map(name=><img key={name} className={'v3-machine-layer v3-machine-'+name} src={'/figma-v3/machine-'+name+'.svg'} alt=""/>)}
   <button className={'v3-interact-dog'+(walking?' is-walking':'')+(busy?' is-reacting':'')} onClick={bark} aria-label="강아지를 터치해 짖는 소리 듣기"><img src={figmaSprite(dog?.name||'뽀실',pose)} alt={dog?.name||'강아지'}/></button>
   <div className="v3-machine-dialog">
    {['dialog-bg','dialog-outer','dialog-inner'].map(name=><img key={name} className={'v3-machine-dialog-layer v3-machine-'+name} src={'/figma-v3/machine-'+name+'.svg'} alt=""/>)}
    <span onClick={()=>setVisibleNotice(notice)} aria-live="polite">{visibleNotice}</span>
   </div>
   <div className="v3-interact-controls">{Object.entries(MOTIONS).map(([key,v])=><div className={'v3-machine-action v3-machine-action-'+key} key={key}>
    <button onClick={()=>interact(key)} disabled={actionBlocked(key)} aria-label={v.name}><img src={'/figma-v3/machine-'+(key==='snack'?'feed':key)+'.svg'} alt=""/></button><small>{remainingLabel(key)}</small>
   </div>)}</div>
  </div>
  {error&&<p className="v3-interact-error" role="alert">{error}</p>}
  {!member&&ready&&<button className="v3-interact-login" onClick={openAccount}>로그인하고 교감하기</button>}
  {status&&!status.owned&&<p className="v3-interact-help">이 강아지의 카드를 먼저 수집하면 교감할 수 있어요.</p>}
 </div>;
}
export default function GoInteract(){return <GoShell active="interact"><Interaction/></GoShell>}
