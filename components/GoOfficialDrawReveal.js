'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import GoCardFace from './GoCardFace.js';
import GoElementSparkles,{elementForCard} from './GoElementSparkles.js';
import './GoAlbumCardDetail.css';
import GoSoundToggle from './GoSoundToggle.js';

/** Figma 558:529529 → 558:593265: official draw animation and card reveal. */
export default function GoOfficialDrawReveal({card,onClose}){
 const [phase,setPhase]=useState('reveal');
 useEffect(()=>{
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){setPhase('card');return;}
  const timeout=window.setTimeout(()=>setPhase('card'),950);
  return()=>window.clearTimeout(timeout);
 },[]);
 useEffect(()=>{
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  const onKey=event=>{if(event.key==='Escape')onClose()};
  document.addEventListener('keydown',onKey);
  return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',onKey)};
 },[onClose]);
 return <div className="go-official-reveal-overlay" role="presentation">
  <section className="go-official-reveal-screen" role="dialog" aria-modal="true" aria-label="멍카드 뽑기 결과">
   <button type="button" className="go-official-reveal-close" onClick={onClose} aria-label="닫기">×</button>
   {phase==='reveal'?<>
    <h2>멍멍GO!</h2>
    <div className="go-official-reveal-collar" aria-hidden="true">
     <img className="go-official-sparkles-top" src="/figma-post/sparkle-top.svg" alt=""/>
     <img className="go-official-sparkles-bottom" src="/figma-post/sparkle-bottom.svg" alt=""/>
     <img className="go-official-collar-image" src="/figma-v3/collar.png" alt=""/>
    </div>
    <button type="button" className="go-official-reveal-bottom" onClick={()=>setPhase('card')}>SKIP ›</button>
   </>:<>
    <h2>{card.dogName}{/[가-힣]$/.test(card.dogName||'')&&(card.dogName.charCodeAt(card.dogName.length-1)-0xAC00)%28!==0?'이':''}가 나타났다!</h2>
    <div className="go-official-reveal-card go-album-reveal">
     <GoElementSparkles element={elementForCard(card)} variant="cinematic"/>
     <div className="go-album-detail-card go-official-reveal-face"><GoCardFace card={card}/></div>
    </div>
    {card.title&&<p className="go-official-reveal-caption">{card.title}</p>}
    <Link className="go-official-reveal-bottom" href="/go" onClick={onClose}>내 도감에서 보기 ›</Link>
   </>}
   <GoSoundToggle className="go-official-reveal-sound"/>
  </section>
 </div>;
}
