'use client';
import {useEffect,useRef,useState} from 'react';
import GoCard from './GoCard.js';
import {createGameAudio,GAME_SOUND_KEY} from '../lib/goV3Audio.js';
import {figmaSprite} from '../lib/goV3Game.js';
const defaultRatings={cuteness:3,charm:3,affection:3};
export default function GoCamera({dog,onDone,onSaved,nickname,firstCard=false}){
 const [step,setStep]=useState('intro'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [sound,setSound]=useState(true),[zoom,setZoom]=useState(1),[preview,setPreview]=useState(''),[blob,setBlob]=useState(null),[title,setTitle]=useState('');
 const [saved,setSaved]=useState(null),[scan,setScan]=useState(false);
 const stream=useRef(null),video=useRef(null),audio=useRef(null),timers=useRef([]),mounted=useRef(true),saving=useRef(false);
 useEffect(()=>{mounted.current=true;audio.current=createGameAudio();window.dispatchEvent(new CustomEvent('go-v3-music',{detail:'camera'}));setSound(localStorage.getItem(GAME_SOUND_KEY)!=='off');const onHide=()=>{if(document.hidden)audio.current?.stop()};document.addEventListener('visibilitychange',onHide);return()=>{mounted.current=false;window.dispatchEvent(new CustomEvent('go-v3-music',{detail:'calm'}));timers.current.forEach(clearTimeout);stream.current?.getTracks().forEach(t=>t.stop());audio.current?.dispose();document.removeEventListener('visibilitychange',onHide);};},[]);
 useEffect(()=>{if(step==='live'&&stream.current&&video.current){video.current.srcObject=stream.current;video.current.play().catch(()=>{});}},[step]);
 useEffect(()=>{if(!blob){setPreview('');return;}const url=URL.createObjectURL(blob);setPreview(url);return()=>URL.revokeObjectURL(url);},[blob]);
 function end(){timers.current.forEach(clearTimeout);timers.current=[];stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;audio.current?.stop();onDone?.();}
 function toggleSound(){const value=!sound;setSound(value);localStorage.setItem(GAME_SOUND_KEY,value?'on':'off');if(!value)audio.current?.stop();}
 async function openCamera(){
  if(busy)return;
  setBusy(true);setError('');
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('카메라를 지원하지 않는 브라우저예요.');
   const opened=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:1280}}});
   if(!mounted.current){opened.getTracks().forEach(t=>t.stop());return;}
   stream.current=opened;setStep('live');audio.current?.play('discover');
  }catch(e){setError(e?.name==='NotAllowedError'?'카메라 권한을 허용한 뒤 다시 시도해주세요.':e.message||'카메라를 열지 못했어요.');}
  finally{setBusy(false);}
 }
 function scale(next){const amount=Math.min(2,Math.max(1,next));setZoom(amount);const track=stream.current?.getVideoTracks()?.[0];try{const range=track?.getCapabilities?.()?.zoom;if(range){track.applyConstraints({advanced:[{zoom:Math.min(range.max,Math.max(range.min,amount))}]}).catch(()=>{});}}catch{}}
 function capture(){if(busy||!video.current?.videoWidth)return;setScan(true);audio.current?.play('shutter');timers.current.push(setTimeout(()=>finishCapture(),2000));}
 function finishCapture(){timers.current.forEach(clearTimeout);timers.current=[];const v=video.current;if(!v?.videoWidth){setError('촬영 화면을 확인해주세요.');setScan(false);return;}
  const canvas=document.createElement('canvas');canvas.width=800;canvas.height=800;const ctx=canvas.getContext('2d');const side=Math.min(v.videoWidth,v.videoHeight)/zoom;const x=(v.videoWidth-side)/2,y=(v.videoHeight-side)/2;ctx.drawImage(v,x,y,side,side,0,0,800,800);
  canvas.toBlob(file=>{setScan(false);if(!file){setError('사진 변환에 실패했어요.');return;}stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setBlob(file);setStep('edit');},'image/webp',.84);
 }
 function restart(){setBlob(null);setPreview('');setStep('intro');setScan(false);}
 async function save(){
  if(saving.current||!blob||!title.trim())return;
  saving.current=true;setBusy(true);setError('');
  try{
   const form=new FormData();form.set('dogId',dog.id);form.set('title',title.trim());form.set('description',title.trim());form.set('ratings',JSON.stringify(defaultRatings));form.set('photo',blob,'camera.webp');
   const r=await fetch('/api/go/cards',{method:'POST',body:form});const data=await r.json();if(!r.ok)throw Error(data.error||'카드를 저장하지 못했어요.');
   const current=await fetch('/api/go/cards/'+data.id,{cache:'no-store'}).then(r=>r.json()).catch(()=>({}));
   const card=current.card||{id:data.id,imageUrl:preview,dogName:dog.name,title:title.trim(),nickname:nickname||'멍기록가',capturedAt:data.capturedAt,ratings:defaultRatings};
   setSaved(card);setStep('done');audio.current?.play('acquire');onSaved?.(card);
  }catch(e){setError(e.message);}finally{saving.current=false;setBusy(false);}
 }
 return <div className={'v3-capture v3-capture-'+step}>
  {step==='intro'&&<div className="v3-capture-live-art" style={{backgroundImage:dog.images?.[0]?'url('+dog.images[0]+')':undefined}}>
   <div className="v3-capture-tip"><button onClick={toggleSound}>음원 {sound?'켜짐':'꺼짐'}</button><p>‘네모칸’ 안에 잘 맞춰 수집해주세요</p></div>
   <div className="v3-camera-square"></div><img className="v3-camera-collar" src="/figma-v3/collar.png" alt="픽셀 목줄"/>
   <div className="v3-pixel-dialog v3-camera-dialog-box">야생의 {dog.name}가 나타났다!<button onClick={openCamera} disabled={busy}>▶ {busy?'카메라 연결 중…':'수집한다'}</button><button onClick={end}>　도망간다</button></div>
  </div>}
  {step==='live'&&<div className="v3-capture-live-art"><video ref={video} autoPlay muted playsInline className="v3-camera-video" style={{transform:'scale('+zoom+')'}}/><div className="v3-capture-tip"><button onClick={toggleSound}>음원 {sound?'켜짐':'꺼짐'}</button><p>‘네모칸’ 안에 잘 맞춰 수집해주세요</p></div><div className={'v3-camera-square'+(scan?' is-scanning':'')}/><div className="v3-camera-zoom"><button onClick={()=>scale(zoom-.2)}>−</button><b>{zoom.toFixed(1)}x</b><button onClick={()=>scale(zoom+.2)}>＋</button></div><img src="/figma-v3/collar.png" alt="" className="v3-camera-collar"/>{scan?<div className="v3-pixel-dialog v3-camera-dialog-box">두근두근! {dog.name}를 수집하고 있어요.<button onClick={finishCapture}>▶ SKIP 후 결과보기</button></div>:<div className="v3-pixel-dialog v3-camera-dialog-box">야생의 {dog.name}가 나타났다!<button onClick={capture}>▶ 수집한다</button><button onClick={end}>　도망간다</button></div>}</div>}
  {step==='edit'&&<div className="v3-capture-edit"><h2>수집한 멍멍이 확인하기</h2><img src={preview} className="v3-capture-photo" alt="촬영한 강아지"/><button className="v3-retry" onClick={restart}>다시 수집 ›</button><label>카드 제목<input maxLength={30} value={title} onChange={e=>setTitle(e.target.value)} placeholder={dog.name+'의 소중한 순간'} /></label><p>저장하면 모두의 도감에 바로 공개돼요.</p><button className="v3-yellow-btn" disabled={busy||!title.trim()} onClick={save}>{busy?'저장 중…':'카드 저장하고 게시하기'}</button></div>}
  {step==='done'&&<div className="v3-capture-complete"><h2>멍카드 수집 완료!</h2><div className="v3-complete-card">{saved&&<GoCard card={saved} compact/>}</div><button className="v3-yellow-btn" onClick={end}>내 카드 보러가기</button></div>}
  {error&&<p className="v3-error" role="alert">{error}</p>}
 </div>;
}
