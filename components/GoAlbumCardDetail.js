'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import Link from 'next/link';
import GoCardFace from './GoCardFace.js';
import GoElementSparkles,{elementForCard} from './GoElementSparkles.js';
import GoSoundButton from './GoSoundButton.js';
import {vibrateHiddenUnlock} from '../lib/goBattleHaptics.js';
import {createCompletionSound,COMPLETION_SOUND_KEY,completionSoundEnabled} from '../lib/goCompletionSound.js';
import './GoAlbumCardDetail.css';
/** Figma 681:291113 (normal), 681:289438 (hidden), 681:291996 (custom). */
export default function GoAlbumCardDetail({card,onClose,official=false,preparedSound=null,firstUnlock=false}){
 const audio=useRef(null),[muted,setMuted]=useState(false),[reveal,setReveal]=useState(0),[idle,setIdle]=useState(false);
 const close=useRef(null);
 const isHidden=Boolean(official&&Number(card?.officialSlot)===5);
 useEffect(()=>{
  const previous=document.activeElement;const overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';close.current?.focus({preventScroll:true});
  const player=preparedSound||createCompletionSound();audio.current=player;
  let on=true;try{on=completionSoundEnabled(localStorage.getItem(COMPLETION_SOUND_KEY));}catch{}
  setMuted(!on);if(on){player.prepare();player.play();}
  const timer=firstUnlock&&isHidden?setTimeout(()=>vibrateHiddenUnlock(),1050):null;
  return()=>{if(timer!==null)clearTimeout(timer);player.dispose();audio.current=null;document.body.style.overflow=overflow;previous?.focus?.({preventScroll:true});};
 },[]);
 useEffect(()=>{if(!isHidden)return;setIdle(false);const timer=window.setTimeout(()=>setIdle(true),2150);return()=>window.clearTimeout(timer);},[isHidden,reveal]);
 function replay(){setReveal(x=>x+1);setIdle(false);if(!muted){audio.current?.stop();audio.current?.play();}}
 function toggleSound(){setMuted(m=>{const next=!m;try{localStorage.setItem(COMPLETION_SOUND_KEY,next?'off':'on');window.dispatchEvent(new Event('go-v3-settings-changed'));}catch{}if(next)audio.current?.stop();else audio.current?.play();return next;});}
 function keys(e){if(e.key==='Escape'){e.preventDefault();onClose();}}
 const link=official?null:card.status==='approved'&&card.id?'/go/posts/'+encodeURIComponent(card.id):null;
 return createPortal(<div className="go-album-detail-mask" role="presentation" onClick={onClose}>
  <section role="dialog" aria-modal="true" aria-label={(card.title||card.dogName)+' 멍카드 상세 조회'} className={'go-album-detail'+(isHidden?' is-hidden':'')} onKeyDown={keys} onClick={e=>e.stopPropagation()}>
   <button ref={close} type="button" className="go-album-detail-close" onClick={onClose} aria-label="닫기">×</button>
   <h2>{card.title||card.dogName}</h2>
   <div className="go-album-detail-stage" onClick={replay} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();replay();}}} role="button" tabIndex={0} aria-label="멍카드 등장 애니메이션 다시 재생">
    <div key={reveal} className={'go-album-reveal'+(isHidden?' is-hidden':'')+(isHidden&&idle?' is-idle':'')} data-hidden-sequence={isHidden?'hologram-reveal-v2':undefined} aria-hidden="true">
     {isHidden&&<><span className="go-hidden-aura"/><span className="go-hidden-pulse"/><span className="go-hidden-flash"/></>}
     <GoElementSparkles element={elementForCard(card)} variant="cinematic"/>
     {isHidden&&<div className="go-album-hidden-burst">
      {Array.from({length:28},(_,i)=><i key={i} style={{
       '--ray-angle':(i*360/28)+'deg',
       '--ray-distance':(118+(i%6)*14)+'px',
       '--ray-size':(14+(i%3)*5)+'px',
       '--ray-dot-size':(4+(i%3)*2)+'px',
       '--ray-delay':(640+(i%5)*56)+'ms'
      }}/>)}
     </div>}
     <div className="go-album-detail-card"><GoCardFace card={card}/>{isHidden&&<span className="go-album-hologram"/>}</div>
    </div>
   </div>
   <footer className="go-album-detail-footer">
    {link?<Link href={link} onClick={onClose}>모두의 도감에서 보기 ›</Link>:<button type="button" onClick={onClose}>내 도감에서 보기 ›</button>}
    <GoSoundButton enabled={!muted} onClick={toggleSound}/>
   </footer>
  </section>
 </div>,document.body);
}
