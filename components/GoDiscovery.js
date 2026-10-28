'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';

const HIDE_KEY='baronado-go-intro-hide-until';
const SEEN_KEY='baronado-go-intro-session-seen';
const WEEK=7*24*60*60*1000;

export default function GoDiscovery({dog}){
 const [open,setOpen]=useState(false);
 const closeRef=useRef(null);
 useEffect(()=>{
  try{
   const until=Number(localStorage.getItem(HIDE_KEY)||0);
   if(!sessionStorage.getItem(SEEN_KEY)&&(!until||Date.now()>until))setOpen(true);
  }catch{}
 },[]);
 useEffect(()=>{
  if(!open)return;
  const prior=document.activeElement;
  const onKey=event=>{
   if(event.key==='Escape'){dismiss();return;}
   if(event.key==='Tab'){
    const controls=document.querySelectorAll('.go-intro-dialog button,.go-intro-dialog a');
    if(!controls.length)return;
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  };
  window.addEventListener('keydown',onKey);
  closeRef.current?.focus();
  return()=>{window.removeEventListener('keydown',onKey);prior?.focus?.({preventScroll:true});};
 },[open]);
 function dismiss(days=0){
  try{
   sessionStorage.setItem(SEEN_KEY,'1');
   if(days)localStorage.setItem(HIDE_KEY,String(Date.now()+WEEK));
  }catch{}
  setOpen(false);
 }
 return <>
  <Link href="/go" className="go-intro-banner" aria-label="멍멍GO! 나만의 멍멍 도감 완성하러 가기">
   <div className="go-intro-banner-copy">
    <img src="/meonggo-reference-logo.svg" alt="멍멍GO!"/>
    <p>멍기록가님만의 도감을 완성해보세요!</p>
   </div>
   <span className="go-intro-banner-arrow" aria-hidden="true">→</span>
  </Link>
  {open&&<div className="go-intro-backdrop" role="presentation">
   <section className="go-intro-dialog" role="dialog" aria-modal="true" aria-labelledby="go-intro-title">
    <button ref={closeRef} className="go-intro-close" type="button" onClick={()=>dismiss()} aria-label="첫 방문 안내 닫기">×</button>
    <img className="go-intro-logo" src="/meonggo-reference-logo.svg" alt="멍멍GO!"/>
    <h2 id="go-intro-title">멍기록가님,<br/>첫 모험을 시작해볼까요?</h2>
    <div className="go-intro-art" aria-hidden="true">
     <div className="go-intro-example-card">
      {dog?.images?.[0]?<img src={dog.images[0]} alt=""/>:<div className="go-intro-example-empty"><img src="/go-dog-silhouette.svg" alt=""/></div>}
      <strong>{dog?.name||'멍멍이'}</strong>
      <span>기분 좋은 산책</span>
      <span className="go-intro-stars">★★★</span>
      <small>우리 집 행복이</small>
     </div>
     <img className="go-intro-character" src="/go-dog-silhouette.svg" alt=""/>
    </div>
    <Link className="go-intro-primary" href="/go" onClick={()=>dismiss()}>첫 도감 펼치기</Link>
    <button type="button" className="go-intro-skip" onClick={()=>dismiss(7)}>7일간 보지 않기</button>
   </section>
  </div>}
 </>;
}
