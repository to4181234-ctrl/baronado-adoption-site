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
 const [dog,setDog]=useState(null),[status,setStatus]=useState(null),[pose,setPose]=useState('front'),[notice,setNotice]=useState('멍멍!\n(안녕! 자는게 아니라\n생각중이었어~)'),[busy,setBusy]=useState(false),[sound,setSound]=useState(true),[error,setError]=useState('');
 const audio=useRef(null),timer=useRef(null),barks=useRef(0);
 useEffect(()=>{fetchDog(id).then(setDog).catch(()=>setError('강아지 정보를 불러오지 못했어요.'));},[id]);
 useEffect(()=>{if(!ready||!member)return;fetch('/api/go/interaction?dogId='+encodeURIComponent(id)).then(r=>r.json()).then(setStatus).catch(()=>setError('친밀도를 불러오지 못했어요.'));},[id,ready,member?.id]);
 useEffect(()=>{audio.current=createGameAudio();setSound(localStorage.getItem(GAME_SOUND_KEY)!=='off');const hide=()=>{if(document.hidden)audio.current?.stop()};document.addEventListener('visibilitychange',hide);return()=>{clearTimeout(timer.current);audio.current?.dispose();document.removeEventListener('visibilitychange',hide);};},[]);
 function soundToggle(){const next=!sound;setSound(next);localStorage.setItem(GAME_SOUND_KEY,next?'on':'off');if(!next)audio.current?.stop();}
 function bark(){if(busy)return;barks.current=(barks.current+1)%3;audio.current?.play('bark'+(barks.current+1));setNotice(dog?.name+'가 반갑게 짖었어요!');}
 async function interact(action){
  if(busy)return;
  if(!member){openAccount();return;}
  if(!status?.owned){setError('먼저 '+dog?.name+'의 멍카드를 수집해주세요.');return;}
  if(!status?.actions?.[action]?.remaining){setError('오늘 사용할 수 있는 횟수가 없어요.');return;}
  if(status?.actions?.[action]?.nextAt&&Date.now()<Date.parse(status.actions[action].nextAt)){setError('30분 뒤에 다시 이용할 수 있어요.');return;}
  setBusy(true);setError('');
  try{const r=await fetch('/api/go/interaction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dogId:id,action})});const d=await r.json();if(!r.ok)throw Error(d.error||'교감에 실패했어요.');
   const m=MOTIONS[action];setPose(m.pose);setNotice(m.message);audio.current?.play(m.audio);
   setStatus(old=>({...old,level:d.level,actions:{...old.actions,[action]:{remaining:d.remaining,nextAt:d.availableAt}}}));
   timer.current=setTimeout(()=>{setPose('front');setNotice('또 만나요!');setBusy(false);},800);
  }catch(e){setError(e.message);setBusy(false);}
 }
 return <div className="v3-interact v3-interact-figma">
  <div className="v3-interact-affinity">친밀도 <b>{status?.level||0} / 10</b></div>
  <button className="v3-interact-sound" aria-label={sound?'소리 끄기':'소리 켜기'} onClick={soundToggle}><img src={'/figma-v3/sound-'+(sound?'on':'off')+'.png'} alt=""/></button>
  <button className="v3-interact-close" aria-label="교감 닫기" onClick={()=>router.push('/go/'+id)}>×</button>
  <div className="v3-interact-machine">
   {['body-border','body-white','bezel-border','bezel-gray','screen-border','screen-white'].map(name=><img key={name} className={'v3-machine-layer v3-machine-'+name} src={'/figma-v3/machine-'+name+'.svg'} alt=""/>)}
   <button className={'v3-interact-dog'+(busy?' moving':'')} onClick={bark} aria-label="강아지를 터치해 짖는 소리 듣기"><img src={figmaSprite(dog?.name||'뽀실',pose)} alt={dog?.name||'강아지'}/></button>
   <div className="v3-machine-dialog">
    {['dialog-bg','dialog-outer','dialog-inner'].map(name=><img key={name} className={'v3-machine-dialog-layer v3-machine-'+name} src={'/figma-v3/machine-'+name+'.svg'} alt=""/>)}
    <span>{notice}</span>
   </div>
   <div className="v3-interact-controls">{Object.entries(MOTIONS).map(([key,v])=><div className={'v3-machine-action v3-machine-action-'+key} key={key}>
    <button onClick={()=>interact(key)} disabled={busy||!member||!status?.actions?.[key]?.remaining||!status?.owned} aria-label={v.name}><img src={'/figma-v3/machine-'+(key==='snack'?'feed':key)+'.svg'} alt=""/></button><small>{status?.actions?.[key]?.remaining??2}/2</small>
   </div>)}</div>
  </div>
  {error&&<p className="v3-interact-error" role="alert">{error}</p>}
  {!member&&ready&&<button className="v3-interact-login" onClick={openAccount}>로그인하고 교감하기</button>}
  {status&&!status.owned&&<p className="v3-interact-help">이 강아지의 카드를 먼저 수집하면 교감할 수 있어요.</p>}
 </div>;
}
export default function GoInteract(){return <GoShell active="interact"><Interaction/></GoShell>}
