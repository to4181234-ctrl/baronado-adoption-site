'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import GoCompletion from './GoCompletion.js';
import GoCardExport from './GoCardExport.js';
import GoSoundButton from './GoSoundButton.js';
import {createCompletionSound,COMPLETION_SOUND_KEY,completionSoundEnabled} from '../lib/goCompletionSound.js';

function PhotoZoom({card,onClose}){
 const close=useRef(null);
 useEffect(()=>{const previous=document.activeElement;close.current?.focus({preventScroll:true});return()=>previous?.focus?.({preventScroll:true});},[]);
 return <div className="go-photo-zoom" role="dialog" aria-modal="true" aria-label={card.dogName+' 촬영 사진 크게 보기'} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}}}>
  <div className="go-photo-zoom-head"><span>촬영 원본 · {card.dogName}</span><button ref={close} type="button" onClick={onClose} aria-label="사진 크게 보기 닫기">×</button></div>
  <div className="go-photo-zoom-stage"><img src={card.imageUrl} alt={card.dogName+'의 원본 촬영 사진'} /></div>
  <p>사진을 화면에 맞춰 크게 보여드려요.</p>
 </div>;
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
   <button className="go-viewer-zoom-action" type="button" onClick={()=>setZoomed(true)} aria-label="촬영한 사진 크게 보기"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 4H4v5m16 6v5h-5M4 4l7 7m9 9-7-7"/></svg><span>사진 크게 보기</span></button>
  </div>
  <div className="go-viewer-main-actions"><button className="go-viewer-save" type="button" onClick={()=>setExporting(true)}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/></svg>이미지 저장·공유</button><button className="go-viewer-like" type="button" disabled={liking||current.status!=='approved'} aria-pressed={Boolean(current.liked)} aria-busy={liking} onClick={toggleLike}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/></svg>좋아요 {current.likeCount||0}</button></div>
  {error&&<p className="go-viewer-error" role="status">{error}</p>}
  <p className="go-viewer-replay-hint">카드를 터치하면 반짝임 효과가 다시 재생돼요.</p>
 </div>;
 return <><GoCompletion card={current} viewOnly soundButton={<GoSoundButton enabled={enabled} onClick={toggle}/>} onReplay={replay} onDone={onClose} viewerActions={controls}/>{zoomed&&<PhotoZoom card={current} onClose={()=>setZoomed(false)}/ >}{exporting&&<GoCardExport card={current} overlayClassName="go-viewer-export-overlay" onRecorded={count=>{setCurrent(previous=>({...previous,shareCount:Math.max(previous.shareCount||0,count)}));onCardChanged?.({shareCount:count});}} onClose={()=>setExporting(false)}/>}</>;
}
