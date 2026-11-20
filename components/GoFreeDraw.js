'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createGameAudio} from '../lib/goV3Audio.js';
import Link from 'next/link';
import GoCollarDialogue from './GoCollarDialogue.js';
import GoOfficialDrawReveal from './GoOfficialDrawReveal.js';
import GoDuplicateCompare from './GoDuplicateCompare.js';
import GoSoundToggle from './GoSoundToggle.js';
import {useGoSession} from './GoShell.js';
import {enqueueGoCoinNotice} from '../lib/goCoinNotices.js';

function displayCard(dog,slot){
 const original=dog?.slots?.find(card=>card.slot===slot);
 return {dogName:dog?.name||'강아지',nickname:'바로나도',title:original?.title||'공식 멍카드',
  imageUrl:original?.imageUrl||'',battle:{power:original?.power??1,charm:original?.charm??1},
  status:'approved',capturedAt:original?.acquiredAt||null,officialSlot:slot};
}
/** Daily free draws; entry location is the My Album screen (Figma 690:289241). */
export default function GoFreeDraw({onClose}){
 const {member}=useGoSession();
 const [catalog,setCatalog]=useState(null);
 const requestRef=useRef(null);
 const inFlightRef=useRef(false);
 const animationRef=useRef(false);
 const sound=useRef(null);
 useEffect(()=>{sound.current=createGameAudio();return()=>{sound.current?.dispose();sound.current=null;};},[]);
 const [choice,setChoice]=useState(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [duplicate,setDuplicate]=useState(null);
 const [revealed,setRevealed]=useState(null);
 const [noImage,setNoImage]=useState(false);
 const [animationOpen,setAnimationOpen]=useState(false);
 const [animationDuplicate,setAnimationDuplicate]=useState(null);
 const [animationError,setAnimationError]=useState('');
 const refresh=useCallback(async()=>{
  const response=await fetch('/api/go/official',{cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'오늘의 멍카드를 확인하지 못했어요.');
  setCatalog(data);
  if(data.pendingDuplicate&&!animationRef.current)setDuplicate(data.pendingDuplicate);
  return data;
 },[]);
 useEffect(()=>{let active=true;refresh().catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[refresh]);
 useEffect(()=>{
  const onKey=event=>{if(event.key==='Escape'&&!duplicate&&!busy)onClose()};
  document.addEventListener('keydown',onKey);
  const prior=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=prior};
 },[onClose,duplicate,busy]);
 function showCard(data,latest){
  const card=displayCard(latest?.dogs?.find(d=>d.dogId===data.dogId),data.slot);
  if(card.imageUrl)setRevealed(card);
  else {setNoImage(true);setAnimationError('카드를 지급했지만 이미지를 불러올 수 없어요. 내 도감에서 확인해주세요.');}
 }
 async function draw(index){
  if(inFlightRef.current||busy||!Number.isInteger(index)||index<0||index>2||!catalog||catalog.drawUsed||!member?.id)return;
  inFlightRef.current=true;
  animationRef.current=true;
  setAnimationDuplicate(null);setAnimationError('');setRevealed(null);
  setAnimationOpen(true);
  setChoice(index);setBusy(true);setError('');
  const storageKey='meonggo:free-pending-request:'+member.id;
  try{
   if(!requestRef.current){
    try{requestRef.current=sessionStorage.getItem(storageKey);}catch{}
   }
   if(!requestRef.current){
    requestRef.current=crypto.randomUUID();
    try{sessionStorage.setItem(storageKey,requestRef.current);}catch{}
   }
   const response=await fetch('/api/go/official',{method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'draw',requestId:requestRef.current})});
   const data=await response.json();
   if(!response.ok||!data.ok){
    if(response.status===409){requestRef.current=null;try{sessionStorage.removeItem(storageKey);}catch{}}
    throw Error(data.error||'무료 뽑기에 실패했어요.');
   }
   requestRef.current=null;
   try{sessionStorage.removeItem(storageKey);}catch{}
   if(Number.isInteger(data.coinsAdded)&&data.coinsAdded>0){
    enqueueGoCoinNotice(data.coinsAdded);
    window.dispatchEvent(new CustomEvent('go-coins-changed',{detail:{notified:true}}));
   }else window.dispatchEvent(new CustomEvent('go-coins-changed',{detail:{notified:false}}));
   const latest=await refresh();
   void sound.current?.play('discover');
   if(data.requiresChoice){setAnimationDuplicate(latest.pendingDuplicate||{choiceId:data.drawId,dogId:data.dogId,slot:data.slot,proposedPower:data.proposedPower,proposedCharm:data.proposedCharm});}
   else showCard(data,latest);
  }catch(e){setError(e.message);setAnimationError(e.message)}finally{inFlightRef.current=false;setBusy(false)}
 }
 async function resolve(replace){
  if(!duplicate||busy)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/go/official',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'resolve',choiceId:duplicate.choiceId,replace})});
   const data=await response.json();
   if(!response.ok||!data.ok)throw Error(data.error||'카드 선택을 저장하지 못했어요.');
   const previous=duplicate;
   const latest=await refresh();
   setDuplicate(null);
   showCard(previous,latest);
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <>
  <div className="go-free-draw-overlay" role="presentation" style={{display:duplicate||animationOpen||revealed?'none':undefined}}>
   <section className="go-free-draw-screen" role="dialog" aria-modal="true" aria-label="하루 두 번 무료 멍카드 뽑기">
    <button className="go-free-draw-close" type="button" disabled={busy||Boolean(duplicate)} onClick={onClose} aria-label="닫기">×</button>
    <h2>멍멍GO!</h2>
    {catalog?.drawUsed&&!duplicate&&!revealed? <div className="go-free-draw-used" role="status">
      <strong>오늘의 뽑기 완료!</strong>
      <p>무료 멍카드 뽑기는 매일 자정에 초기화돼요.</p>
      <button type="button" onClick={onClose}>확인</button>
    </div>:<>
     <div className="go-free-draw-collars" aria-label="목줄 하나 선택">
      {[0,1,2].map(index=><button key={index} type="button" aria-pressed={choice===index} disabled={busy||Boolean(duplicate)}
       onClick={()=>{void sound.current?.play('collar');void draw(index);}} aria-label={'목줄 '+(index+1)+' 선택하고 무료 카드 뽑기'}>
       <img src="/figma-v3/collar.png" alt=""/>
      </button>)}
     </div>
     <div className="go-free-draw-dialogue"><GoCollarDialogue/></div>
     <GoSoundToggle className="go-free-draw-sound"/>
    </>}
    {error&&<p role="alert" className="go-free-draw-error">{error}</p>}
    {noImage&&<p role="status" className="go-free-draw-error">카드를 지급했지만 이미지를 불러올 수 없어요. 내 도감에서 확인해주세요.
     <Link href="/go" onClick={onClose}>내 도감에서 보기</Link></p>}
   </section>
  </div>
  {duplicate&&<GoDuplicateCompare dog={catalog?.dogs?.find(d=>d.dogId===duplicate.dogId)} duplicate={duplicate} busy={busy} error={error} onResolve={resolve} onClose={()=>resolve(false)}/>}
  {(animationOpen||revealed)&&<GoOfficialDrawReveal card={revealed} duplicate={animationDuplicate} error={animationError} busy={busy}
    onDuplicate={()=>{animationRef.current=false;setAnimationOpen(false);setDuplicate(animationDuplicate);setAnimationDuplicate(null);}}
    onClose={onClose}/>}
 </>;
}
