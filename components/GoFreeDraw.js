'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import GoPixelChoice from './GoPixelChoice.js';
import GoOfficialDrawReveal from './GoOfficialDrawReveal.js';
import GoDuplicateCompare from './GoDuplicateCompare.js';
import {enqueueGoCoinNotice} from '../lib/goCoinNotices.js';

function displayCard(dog,slot){
 const original=dog?.slots?.find(card=>card.slot===slot);
 return {dogName:dog?.name||'강아지',nickname:'바로나도',title:original?.title||'공식 멍카드',
  imageUrl:original?.imageUrl||'',battle:{power:original?.power??1,charm:original?.charm??1},
  status:'approved',capturedAt:original?.acquiredAt||null,officialSlot:slot};
}
/** Free daily draw stays over the quest screen (Figma 558:479084 / 558:606067). */
export default function GoFreeDraw({onClose}){
 const [catalog,setCatalog]=useState(null);
 const [choice,setChoice]=useState(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [duplicate,setDuplicate]=useState(null);
 const [revealed,setRevealed]=useState(null);
 const [noImage,setNoImage]=useState(false);
 const refresh=useCallback(async()=>{
  const response=await fetch('/api/go/official',{cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'오늘의 멍카드를 확인하지 못했어요.');
  setCatalog(data);
  if(data.pendingDuplicate)setDuplicate(data.pendingDuplicate);
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
  else setNoImage(true);
 }
 async function draw(){
  if(busy||choice===null||catalog?.drawUsed)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/go/official',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'draw'})});
   const data=await response.json();
   if(!response.ok||!data.ok)throw Error(data.error||'무료 뽑기에 실패했어요.');
   if(Number.isInteger(data.coinsAdded)&&data.coinsAdded>0){
    enqueueGoCoinNotice(data.coinsAdded);
    window.dispatchEvent(new CustomEvent('go-coins-changed',{detail:{notified:true}}));
   }else window.dispatchEvent(new CustomEvent('go-coins-changed',{detail:{notified:false}}));
   const latest=await refresh();
   if(data.requiresChoice){setDuplicate(latest.pendingDuplicate||{dogId:data.dogId,slot:data.slot,proposedPower:data.proposedPower,proposedCharm:data.proposedCharm});}
   else showCard(data,latest);
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 async function resolve(replace){
  if(!duplicate||busy)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/go/official',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'resolve',replace})});
   const data=await response.json();
   if(!response.ok||!data.ok)throw Error(data.error||'카드 선택을 저장하지 못했어요.');
   const previous=duplicate;
   const latest=await refresh();
   setDuplicate(null);
   showCard(previous,latest);
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <>
  <div className="go-free-draw-overlay" role="presentation" style={{display:duplicate||revealed?'none':undefined}}>
   <section className="go-free-draw-screen" role="dialog" aria-modal="true" aria-label="하루 한 번 무료 멍카드 뽑기">
    <button className="go-free-draw-close" type="button" disabled={busy||Boolean(duplicate)} onClick={onClose} aria-label="닫기">×</button>
    <h2>멍멍GO!</h2>
    {catalog?.drawUsed&&!duplicate&&!revealed? <div className="go-free-draw-used" role="status">
      <strong>오늘의 뽑기 완료!</strong>
      <p>무료 멍카드 뽑기는 매일 자정에 초기화돼요.</p>
      <button type="button" onClick={onClose}>확인</button>
    </div>:<>
     <div className="go-free-draw-collars" aria-label="목줄 하나 선택">
      {[0,1,2].map(index=><button key={index} type="button" aria-pressed={choice===index} disabled={busy||Boolean(duplicate)}
       onClick={()=>setChoice(index)} aria-label={'목줄 '+(index+1)+' 선택'}>
       <img src="/figma-v3/collar.png" alt=""/>
      </button>)}
     </div>
     <div className="go-free-draw-dialogue">
      <img src="/figma-v3/discovery-dialog-bg.svg" alt=""/>
      <img src="/figma-v3/discovery-dialog-outer.svg" alt=""/>
      <img src="/figma-v3/discovery-dialog-inner.svg" alt=""/>
      <div className="go-free-draw-dialogue-content">
       <p>오늘의 멍멍이는 누구일까요?</p>
       <GoPixelChoice initial disabled={choice===null||busy||!catalog||Boolean(duplicate)} onClick={draw}>하나 고른다</GoPixelChoice>
       <GoPixelChoice disabled={busy||Boolean(duplicate)} onClick={onClose}>도망간다</GoPixelChoice>
      </div>
     </div>
     <img className="go-free-draw-sound" src="/figma-v3/sound-on.png" alt="소리 켜짐"/>
    </>}
    {error&&!duplicate&&<p role="alert" className="go-free-draw-error">{error}</p>}
    {noImage&&<p role="status" className="go-free-draw-error">카드를 지급했지만 이미지를 불러올 수 없어요. 내 도감에서 확인해주세요.
     <Link href="/go" onClick={onClose}>내 도감에서 보기</Link></p>}
   </section>
  </div>
  {duplicate&&<GoDuplicateCompare dog={catalog?.dogs?.find(d=>d.dogId===duplicate.dogId)} duplicate={duplicate} busy={busy} error={error} onResolve={resolve} onClose={onClose}/>}
  {revealed&&<GoOfficialDrawReveal card={revealed} onClose={onClose}/>}
 </>;
}
