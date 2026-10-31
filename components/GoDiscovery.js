'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {figmaSprite,FIGMA_DOGS} from '../lib/goV3Game.js';
import {createGameAudio,GAME_SOUND_KEY} from '../lib/goV3Audio.js';
const HIDE_KEY='baronado-go-intro-hide-until',SEEN_KEY='baronado-go-intro-session-seen',POPUP_ENABLED_KEY='baronado-go-intro-enabled',WEEK=7*86400000;
export default function GoDiscovery({dogs=[],dog=null}){
 const [open,setOpen]=useState(false),[stage,setStage]=useState('choice'),[hide,setHide]=useState(false),[sound,setSound]=useState(true),[chosen,setChosen]=useState(null);
 const t=useRef(null),audio=useRef(null);
 useEffect(()=>{audio.current=createGameAudio();setSound(localStorage.getItem(GAME_SOUND_KEY)!=='off');let already=false;try{already=localStorage.getItem(POPUP_ENABLED_KEY)==='off'||sessionStorage.getItem(SEEN_KEY)==='1'||Number(localStorage.getItem(HIDE_KEY)||0)>Date.now();}catch{}if(!already){setOpen(true);try{sessionStorage.setItem(SEEN_KEY,'1');}catch{}}const h=()=>{if(document.hidden)audio.current?.stop();};document.addEventListener('visibilitychange',h);return()=>{clearTimeout(t.current);audio.current?.dispose();document.removeEventListener('visibilitychange',h);};},[]);
 function close(){clearTimeout(t.current);audio.current?.stop();setOpen(false);if(hide)try{localStorage.setItem(HIDE_KEY,String(Date.now()+WEEK));}catch{}}
 function reveal(i){if(stage!=='choice')return;const list=Array.isArray(dogs)?dogs.filter(d=>FIGMA_DOGS.includes(d.name)):[];const d=list[Math.floor(Math.random()*Math.max(1,list.length))]||dog||null;setChosen(d);setStage('reveal');audio.current?.play('collar');t.current=setTimeout(()=>finish(),2000);}
 function finish(){clearTimeout(t.current);setStage('result');audio.current?.play('discover');}
 function toggle(){const next=!sound;setSound(next);try{localStorage.setItem(GAME_SOUND_KEY,next?'on':'off');}catch{}if(!next)audio.current?.stop();}
 return open&&<div className="v3-discovery-backdrop v3-discovery-figma" onClick={close} role="presentation"><section className="v3-discovery-modal" role="dialog" aria-modal="true" aria-label="첫 방문 멍멍GO! 발견" onClick={e=>e.stopPropagation()}>
  <button className="v3-discovery-close" aria-label="닫기" onClick={close}>×</button>
  <h2><img className="v3-discovery-figma-title" src="/figma-v3/discovery-title.svg" alt="멍멍GO!"/></h2>
  <div className="v3-discovery-stage">
   {stage==='choice'?<div className="v3-collars">{[0,1,2].map(i=><button type="button" key={i} onClick={()=>reveal(i)} aria-label={'목줄 '+(i+1)+' 선택'}><img src="/figma-v3/collar.png" alt="픽셀 목줄"/></button>)}</div>:stage==='reveal'?<img className="v3-discovery-reveal" src="/figma-v3/collar.png" alt="강아지를 찾는 중"/>:<img className="v3-discovery-reveal" src={figmaSprite(chosen?.name||'뽀실')} alt={chosen?.name||'강아지'}/>}
  </div>
  <div className="v3-discovery-dialog">{['bg','outer','inner'].map(n=><img key={n} className={'v3-discovery-dialog-layer v3-discovery-dialog-'+n} src={'/figma-v3/discovery-dialog-'+n+'.svg'} alt=""/>)}<div className="v3-discovery-dialog-content">{stage==='choice'?<>오늘의 멍멍이는 누구일까요?<button onClick={()=>reveal(0)}><img className="v3-discovery-arrow" src="/figma-v3/discovery-select-arrow.svg" alt=""/>하나 고른다</button><button onClick={close}>　도망간다</button></>:stage==='reveal'?<>두근두근! 누구일까요?<button onClick={finish}>▶ SKIP 후 결과보기</button></>:<>야생의 {chosen?.name||'멍멍이'}가 나타났다!<Link href={chosen?'/go/'+chosen.id:'/go'} onClick={close}>▶ 멍멍GO!하러가기</Link><Link href="/" onClick={close}>　가족을 찾아요 둘러보기</Link></>}</div></div>
  <div className="v3-discovery-bottom"><label><input type="checkbox" checked={hide} onChange={e=>setHide(e.target.checked)}/> 7일간 보지 않기</label><button onClick={toggle} aria-label="사운드 켜기/끄기"><img src={'/figma-v3/sound-'+(sound?'on':'off')+'.png'} alt={sound?'소리 켜짐':'소리 꺼짐'}/></button></div>
 </section></div>;
}
