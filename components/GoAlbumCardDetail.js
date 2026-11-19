'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import Link from 'next/link';
import GoCardFace from './GoCardFace.js';
import GoElementSparkles,{elementForCard} from './GoElementSparkles.js';
import GoSoundButton from './GoSoundButton.js';
import {createCompletionSound,COMPLETION_SOUND_KEY,completionSoundEnabled} from '../lib/goCompletionSound.js';
import './GoAlbumCardDetail.css';
/** Figma 681:291113 (normal), 681:289438 (hidden), 681:291996 (custom). */
export default function GoAlbumCardDetail({card,onClose,official=false}){
 const audio=useRef(null),[muted,setMuted]=useState(false),[reveal,setReveal]=useState(0);
 const close=useRef(null);
 useEffect(()=>{
  const previous=document.activeElement;const overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';close.current?.focus({preventScroll:true});
  const player=createCompletionSound();audio.current=player;
  let on=true;try{on=completionSoundEnabled(localStorage.getItem(COMPLETION_SOUND_KEY));}catch{}
  setMuted(!on);if(on){player.prepare();player.play();}
  return()=>{player.dispose();audio.current=null;document.body.style.overflow=overflow;previous?.focus?.({preventScroll:true});};
 },[]);
 function replay(){setReveal(x=>x+1);if(!muted){audio.current?.stop();audio.current?.play();}}
 function toggleSound(){setMuted(m=>{const next=!m;try{localStorage.setItem(COMPLETION_SOUND_KEY,next?'off':'on');window.dispatchEvent(new Event('go-v3-settings-changed'));}catch{}if(next)audio.current?.stop();else audio.current?.play();return next;});}
 function keys(e){if(e.key==='Escape'){e.preventDefault();onClose();}}
 const link=official?null:card.status==='approved'&&card.id?'/go/posts/'+encodeURIComponent(card.id):null;
 return createPortal(<div className="go-album-detail-mask" role="presentation" onClick={onClose}>
  <section role="dialog" aria-modal="true" aria-label={(card.title||card.dogName)+' 멍카드 상세 조회'} className="go-album-detail" onKeyDown={keys} onClick={e=>e.stopPropagation()}>
   <button ref={close} type="button" className="go-album-detail-close" onClick={onClose} aria-label="닫기">×</button>
   <h2>{card.title||card.dogName}</h2>
   <div className="go-album-detail-stage" onClick={replay} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();replay();}}} role="button" tabIndex={0} aria-label="멍카드 등장 애니메이션 다시 재생">
    <div key={reveal} className="go-album-reveal" aria-hidden="true"><GoElementSparkles element={elementForCard(card)} variant="cinematic"/><div className="go-album-detail-card"><GoCardFace card={card}/></div></div>
   </div>
   <footer className="go-album-detail-footer">
    {link?<Link href={link} onClick={onClose}>모두의 도감에서 보기 ›</Link>:<button type="button" onClick={onClose}>내 도감에서 보기 ›</button>}
    <GoSoundButton enabled={!muted} onClick={toggleSound}/>
   </footer>
  </section>
 </div>,document.body);
}
