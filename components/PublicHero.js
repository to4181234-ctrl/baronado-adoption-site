'use client';
import {useEffect,useRef,useState} from 'react';

// The original Figma artwork is bundled locally, not re-created as text or CSS.
// Accept up to three actual published banner records when the admin source is connected.
const FALLBACK=[{id:'figma-hero',image:'/figma-v3/hero-logo.svg',alt:'바로나도',href:null,isLogo:true}];
export default function PublicHero({banners=[]}){
 const [published,setPublished]=useState(null);
 useEffect(()=>{const controller=new AbortController();fetch('/api/banners',{signal:controller.signal,cache:'no-store'}).then(r=>{if(!r.ok)throw Error('배너 조회 실패');return r.json();}).then(d=>{if(!controller.signal.aborted&&Array.isArray(d.banners))setPublished(d.banners);}).catch(()=>{});return()=>controller.abort();},[]);
 const provided=Array.isArray(banners)&&banners.length?banners:published;
 const slides=provided===null?FALLBACK:provided.filter(x=>x&&x.image).slice(0,3);
 const [active,setActive]=useState(0);
 const [paused,setPaused]=useState(false);
 const touch=useRef(null);
 useEffect(()=>{if(active>=slides.length)setActive(0);},[active,slides.length]);
 useEffect(()=>{
  if(slides.length<2||paused)return;
  const timer=window.setInterval(()=>setActive(v=>(v+1)%slides.length),5000);
  return()=>window.clearInterval(timer);
 },[slides.length,paused]);
 const onPointerDown=e=>{touch.current=e.clientX;setPaused(true)};
 const onPointerUp=e=>{if(touch.current===null)return;const diff=e.clientX-touch.current;if(Math.abs(diff)>=35&&slides.length>1)setActive(v=>(v+(diff<0?1:slides.length-1))%slides.length);touch.current=null;setPaused(false)};
 if(!slides.length)return null;
 return <section className="v3-hero v3-figma-hero" aria-roledescription="배너 슬라이드" aria-label="바로나도 안내 배너" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={()=>{touch.current=null;setPaused(false)}} onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}>
  <div className="v3-hero-track" style={{transform:`translateX(-${active*100}%)`}}>
   {slides.map((s,i)=><div key={s.id||i} className={'v3-hero-slide'+(s.isLogo?' is-original':'')} aria-hidden={active!==i}>
    {s.href?<a href={s.href} tabIndex={active===i?0:-1} aria-label={s.alt||'배너 바로가기'}><img src={s.image} alt={s.alt||''}/></a>:<img src={s.image} alt={s.alt||''}/>}
   </div>)}
  </div>
  {slides.length>1&&<div className="v3-hero-dots" aria-label="배너 선택">{slides.map((s,i)=><button key={s.id||i} type="button" aria-label={`${i+1}번째 배너`} aria-current={active===i?'true':undefined} onClick={()=>setActive(i)}/>)}</div>}
 </section>;
}
