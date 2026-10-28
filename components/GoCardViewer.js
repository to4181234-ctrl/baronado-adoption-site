'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {RATING_TRAITS} from '../lib/goRatings.js';
import {cardDate} from '../lib/goShared.js';
import {RatingStar} from './GoRatingsEditor.js';
import GoCompletion from './GoCompletion.js';
import GoCardExport from './GoCardExport.js';
import GoSoundButton from './GoSoundButton.js';
import {createCompletionSound,COMPLETION_SOUND_KEY,completionSoundEnabled} from '../lib/goCompletionSound.js';

function CardDetailZoom({card,onClose}){
 const [tab,setTab]=useState('photo');
 const close=useRef(null),tabs=useRef({});
 const ratings=RATING_TRAITS.filter(trait=>Number.isInteger(card.ratings?.[trait.key]));
 useEffect(()=>{const previous=document.activeElement;close.current?.focus({preventScroll:true});return()=>previous?.focus?.({preventScroll:true});},[]);
 function keys(event){
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();return;}
  if(event.key==='Tab'){
   const controls=Array.from(event.currentTarget.querySelectorAll('button:not(:disabled),[href], [tabindex="0"]')).filter(el=>el.getClientRects().length);
   const first=controls[0],last=controls.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
 }
 function tabKeys(event){
  const options=['photo','story'];
  const next=event.key==='Home'?'photo':event.key==='End'?'story':event.key==='ArrowRight'||event.key==='ArrowLeft'?options[(options.indexOf(tab)+(event.key==='ArrowRight'?1:options.length-1))%options.length]:null;
  if(next){event.preventDefault();setTab(next);tabs.current[next]?.focus();}
 }
 return <section className="go-photo-zoom" role="dialog" aria-modal="true" aria-label="사진과 본문 크게 보기" onKeyDown={keys}>
  <header className="go-photo-zoom-head"><div><span className="go-photo-zoom-kicker">MEONGGO CARD</span><strong>사진/본문 크게 보기</strong></div><button ref={close} type="button" onClick={onClose} aria-label="확대 보기 닫기">×</button></header>
  <div className="go-photo-zoom-tabs" role="tablist" aria-label="크게 볼 내용">
   <button ref={el=>{tabs.current.photo=el;}} id="go-zoom-tab-photo" role="tab" aria-selected={tab==='photo'} aria-controls="go-zoom-panel-photo" tabIndex={tab==='photo'?0:-1} onClick={()=>setTab('photo')} onKeyDown={tabKeys} type="button">사진</button>
   <button ref={el=>{tabs.current.story=el;}} id="go-zoom-tab-story" role="tab" aria-selected={tab==='story'} aria-controls="go-zoom-panel-story" tabIndex={tab==='story'?0:-1} onClick={()=>setTab('story')} onKeyDown={tabKeys} type="button">본문</button>
  </div>
  {tab==='photo'
   ?<div id="go-zoom-panel-photo" className="go-photo-zoom-stage" role="tabpanel" aria-labelledby="go-zoom-tab-photo" tabIndex={0}><img src={card.imageUrl} alt={card.dogName+'의 원본 촬영 사진'}/></div>
   :<div id="go-zoom-panel-story" className="go-photo-zoom-stage go-photo-zoom-story" role="tabpanel" aria-labelledby="go-zoom-tab-story" tabIndex={0}>
    <article className="go-zoom-story-sheet">
     <div className="go-zoom-story-heading"><span className="go-zoom-story-eyebrow">MEONG MEONG GO!</span><p className="go-zoom-story-dog">{card.dogName}</p><h2>{card.title?.trim()||card.dogName+'의 기록'}</h2></div>
     <div className="go-zoom-story-prose"><p>{card.description?.trim()||'아직 작성된 기록이 없어요.'}</p></div>
     {ratings.length>0&&<section className="go-zoom-story-ratings" aria-label="멍멍이 매력 평가"><h3>멍멍이의 매력 기록</h3>{ratings.map(trait=><div key={trait.key} className="go-zoom-story-rating-row"><span>{trait.label}</span><span className="go-zoom-story-stars" role="img" aria-label={trait.label+' 5점 만점에 '+card.ratings[trait.key]+'점'}>{[1,2,3,4,5].map(score=><RatingStar key={score} filled={score<=card.ratings[trait.key]}/>)}</span><b>{card.ratings[trait.key]}<small> / 5</small></b></div>)}</section>}
     <footer className="go-zoom-story-meta"><span>{card.nickname} 멍기록가</span>{card.capturedAt&&<time dateTime={card.capturedAt}>{cardDate(card.capturedAt)}</time>}</footer>
    </article>
   </div>}
  <p className="go-photo-zoom-caption">{tab==='photo'?'촬영한 사진을 원본 비율로 보여드려요.':'카드에 담긴 기록을 큰 글씨로 읽을 수 있어요.'}</p>
 </section>;
}

export default function GoCardViewer({card,onClose,preparedSound,member,onLogin,onCardChanged}){
 const [current,setCurrent]=useState(card),[enabled,setEnabled]=useState(true),[liking,setLiking]=useState(false),[error,setError]=useState(''),[exporting,setExporting]=useState(false),[zoomed,setZoomed]=useState(false);
 const player=useRef(null),on=useRef(true),request=useRef(0);
 useEffect(()=>setCurrent(card),[card]);
 useEffect(()=>{const audio=preparedSound||createCompletionSound();player.current=audio;try{on.current=completionSoundEnabled(localStorage.getItem(COMPLETION_SOUND_KEY));}catch{}setEnabled(on.current);if(on.current)replay();return()=>{request.current++;audio.dispose();player.current=null;};},[]);
 function replay(){const id=++request.current,started=performance.now();player.current?.stop();if(!on.current)return;const delay=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:.3;Promise.resolve(player.current?.prepare()).then(()=>{const elapsed=(performance.now()-started)/1000;if(id===request.current&&on.current&&elapsed<.5)player.current?.play(Math.max(0,delay-elapsed));});}
 function toggle(){on.current=!on.current;setEnabled(on.current);try{localStorage.setItem(COMPLETION_SOUND_KEY,on.current?'on':'off');}catch{}if(on.current)player.current?.prepare();else{request.current++;player.current?.stop();}}
 async function toggleLike(){
  if(!member){onClose();if(onLogin)onLogin();else location.assign('/go');return;}
  if(liking)return;setLiking(true);setError('');
  try{
   const response=await fetch('/api/go/cards/'+current.id+'/like',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({liked:!current.liked})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'좋아요를 저장하지 못했어요.');
   setCurrent(previous=>({...previous,...data}));onCardChanged?.(data);
  }catch(e){setError(e.message||'좋아요를 저장하지 못했어요.');}finally{setLiking(false);}
 }
 const controls=<div className="go-viewer-controls">
  <div className="go-viewer-context">
   <div className="go-viewer-author"><span>이 카드를 기록한 멍기록가</span>{current.ownerId?<Link href={'/go/recorders/'+current.ownerId}>{current.nickname} <span>프로필 보기</span><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m7 4 6 6-6 6"/></svg></Link>:<strong>{current.nickname}</strong>}</div>
   <button className="go-viewer-zoom-action" type="button" onClick={()=>setZoomed(true)} aria-label="사진과 본문 크게 보기"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 4H4v5m16 6v5h-5M4 4l7 7m9 9-7-7"/></svg><span>사진/본문 크게 보기</span></button>
  </div>
  <div className="go-viewer-main-actions"><button className="go-viewer-save" type="button" onClick={()=>setExporting(true)}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/></svg>이미지 저장·공유</button><button className="go-viewer-like" type="button" disabled={liking||current.status!=='approved'} aria-pressed={Boolean(current.liked)} aria-busy={liking} onClick={toggleLike}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/></svg>좋아요 {current.likeCount||0}</button></div>
  {error&&<p className="go-viewer-error" role="status">{error}</p>}
  <p className="go-viewer-replay-hint">카드를 터치하면 반짝임 효과가 다시 재생돼요.</p>
 </div>;
 return <><GoCompletion card={current} viewOnly soundButton={<GoSoundButton enabled={enabled} onClick={toggle}/>} onReplay={replay} onDone={onClose} viewerActions={controls}/>{zoomed&&<CardDetailZoom card={current} onClose={()=>setZoomed(false)}/>}{exporting&&<GoCardExport card={current} overlayClassName="go-viewer-export-overlay" onRecorded={count=>{setCurrent(previous=>({...previous,shareCount:Math.max(previous.shareCount||0,count)}));onCardChanged?.({shareCount:count});}} onClose={()=>setExporting(false)}/>}</>;
}
