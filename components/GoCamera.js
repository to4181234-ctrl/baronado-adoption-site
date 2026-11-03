'use client';
import {useEffect,useRef,useState} from 'react';
import GoCard from './GoCard.js';
import {listenAudioSetting,createGameAudio,GAME_SOUND_KEY} from '../lib/goV3Audio.js';
import {figmaSprite} from '../lib/goV3Game.js';
import Link from 'next/link';
import GoPixelChoice from './GoPixelChoice.js';
import GoReveal from './GoReveal.js';
export default function GoCamera({dog,onDone,onSaved,nickname,firstCard=false}){
 const [step,setStep]=useState('intro'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [sound,setSound]=useState(true),[zoom,setZoom]=useState(1),[preview,setPreview]=useState(''),[blob,setBlob]=useState(null),[title,setTitle]=useState('');
 const [saved,setSaved]=useState(null),[scan,setScan]=useState(false),[cameraError,setCameraError]=useState(false),[permissionOpen,setPermissionOpen]=useState(true);
 const captureFinished=useRef(false),stream=useRef(null),video=useRef(null),guide=useRef(null),audio=useRef(null),timers=useRef([]),mounted=useRef(true),saving=useRef(false);
 const saveRequest=useRef(null),pinch=useRef(null),zoomValue=useRef(1);
 useEffect(()=>listenAudioSetting(setSound),[]);
 useEffect(()=>{mounted.current=true;audio.current=createGameAudio();setSound(localStorage.getItem(GAME_SOUND_KEY)!=='off');const onHide=()=>{if(document.hidden)audio.current?.stop()};document.addEventListener('visibilitychange',onHide);return()=>{mounted.current=false;window.dispatchEvent(new CustomEvent('go-v3-music',{detail:'calm'}));timers.current.forEach(clearTimeout);stream.current?.getTracks().forEach(t=>t.stop());audio.current?.dispose();document.removeEventListener('visibilitychange',onHide);};},[]);
 useEffect(()=>{if(step==='live'&&stream.current&&video.current){video.current.srcObject=stream.current;video.current.play().catch(()=>{});}},[step]);
 useEffect(()=>{if(!blob){setPreview('');return;}const url=URL.createObjectURL(blob);setPreview(url);return()=>URL.revokeObjectURL(url);},[blob]);
 function end(){timers.current.forEach(clearTimeout);timers.current=[];stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;audio.current?.stop();onDone?.();}
 function toggleSound(){const value=!sound;setSound(value);localStorage.setItem(GAME_SOUND_KEY,value?'on':'off');window.dispatchEvent(new Event('go-v3-settings-changed'));if(!value)audio.current?.stop();}
 async function openCamera(){
  if(busy)return;
  setPermissionOpen(false);setBusy(true);setError('');setCameraError(false);
  window.dispatchEvent(new CustomEvent('go-v3-music',{detail:'camera'}));
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('카메라를 지원하지 않는 브라우저예요.');
   const opened=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:1280}}});
   if(!mounted.current){opened.getTracks().forEach(t=>t.stop());return;}
   stream.current=opened;setStep('live');window.dispatchEvent(new CustomEvent('go-v3-music',{detail:'camera'}));
  }catch(e){setCameraError(true);setError(e?.name==='NotAllowedError'?'설정에서 카메라 접근을 허용한 뒤 다시 시도해주세요.':e?.name==='NotFoundError'?'사용할 카메라가 없는 기기예요.':e?.name==='NotReadableError'?'다른 앱에서 카메라를 사용 중인지 확인해주세요.':e.message||'카메라를 열지 못했어요.');}
  finally{setBusy(false);}
 }
 function scale(next){zoomValue.current=Math.min(3,Math.max(1,next));setZoom(zoomValue.current);}
 function pinchStart(event){if(event.touches.length!==2)return;const [a,b]=event.touches;pinch.current={distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),zoom:zoomValue.current};}
 function pinchMove(event){if(event.touches.length!==2||!pinch.current?.distance)return;event.preventDefault();const [a,b]=event.touches;scale(pinch.current.zoom*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/pinch.current.distance);}
 function pinchEnd(){pinch.current=null;}
 useEffect(()=>{if(step!=='live'||!video.current)return;const surface=video.current.parentElement;surface.addEventListener('touchstart',pinchStart,{passive:true});surface.addEventListener('touchmove',pinchMove,{passive:false});surface.addEventListener('touchend',pinchEnd);surface.addEventListener('touchcancel',pinchEnd);return()=>{pinch.current=null;surface.removeEventListener('touchstart',pinchStart);surface.removeEventListener('touchmove',pinchMove);surface.removeEventListener('touchend',pinchEnd);surface.removeEventListener('touchcancel',pinchEnd);};},[step]);
 function retry(){saveRequest.current=null;setBlob(null);setPreview('');setScan(false);scale(1);setError('');setCameraError(false);openCamera();}
 function capture(){if(busy||scan||!video.current?.videoWidth)return;captureFinished.current=false;setScan(true);audio.current?.play('shutter');timers.current.push(setTimeout(()=>finishCapture(),100));}
 function finishCapture(){
  if(captureFinished.current)return;captureFinished.current=true;
  timers.current.forEach(clearTimeout);timers.current=[];
  const v=video.current, box=guide.current;
  if(!v?.videoWidth||!box){captureFinished.current=false;setError('촬영 화면을 확인해주세요.');setScan(false);return;}
  const canvas=document.createElement('canvas');canvas.width=800;canvas.height=800;
  const ctx=canvas.getContext('2d');
  // object-fit:cover maps the source frame to the full-screen video element.
  // Crop exactly the pixels under the fixed 1:1 on-screen guide, including digital zoom.
  const frame=v.parentElement.getBoundingClientRect(),gr=box.getBoundingClientRect();
  // Use the untransformed stage bounds: CSS digital zoom scales the video element itself.
  const sourceScale=Math.max(frame.width/v.videoWidth,frame.height/v.videoHeight);
  const sx=(v.videoWidth-frame.width/sourceScale)/2+(gr.left-frame.left)/sourceScale;
  const sy=(v.videoHeight-frame.height/sourceScale)/2+(gr.top-frame.top)/sourceScale;
  const sw=gr.width/sourceScale,sh=gr.height/sourceScale;
  const factor=zoom;
  const x=v.videoWidth/2+(sx-v.videoWidth/2)/factor;
  const y=v.videoHeight/2+(sy-v.videoHeight/2)/factor;
  ctx.drawImage(v,x,y,sw/factor,sh/factor,0,0,800,800);
  canvas.toBlob(file=>{setScan(false);if(!file){captureFinished.current=false;setError('사진 변환에 실패했어요.');return;}
   stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;
   window.dispatchEvent(new CustomEvent('go-v3-music',{detail:'stop'}));setBlob(file);setStep('edit');},'image/webp',.84);
 }
 function restart(){setBlob(null);setPreview('');setScan(false);setStep('intro');setZoom(1);retry();}

 async function save(){
  if(saving.current||!blob||!title.trim()||title.trim().length>30)return;
  saving.current=true;setBusy(true);setError('');
  try{
   saveRequest.current ||= crypto.randomUUID();
   const form=new FormData();form.set('requestId',saveRequest.current);form.set('dogId',dog.id);form.set('title',title.trim());form.set('photo',blob,'camera.webp');
   const r=await fetch('/api/go/cards',{method:'POST',body:form});const data=await r.json();if(!r.ok)throw Error(data.error||'카드를 저장하지 못했어요.');
   const current=await fetch('/api/go/cards/'+data.id,{cache:'no-store'}).then(r=>r.json()).catch(()=>({}));
   const card=current.card||{id:data.id,imageUrl:preview,dogName:dog.name,title:title.trim(),nickname:nickname||'멍기록가',capturedAt:data.capturedAt,ratings:null};
   setSaved(card);setStep('done');window.dispatchEvent(new CustomEvent('go-v3-music',{detail:'calm'}));onSaved?.(card);
  }catch(e){setError(e.message);}finally{saving.current=false;setBusy(false);}
 }
 return <div className={'v3-capture v3-capture-'+step}>
  {step==='intro'&&<div className="v3-capture-live-art v3-capture-permission-intro">
   <div className="v3-capture-tip"><button onClick={toggleSound} aria-label={sound?'음원 끄기':'음원 켜기'}><img src={'/figma-v3/sound-'+(sound?'on':'off')+'.png'} alt=""/>음원 {sound?'켜짐':'꺼짐'}</button><p>카메라를 켜면 실제 화면에 1:1 가이드가 나타나요.</p></div>
   <div className="v3-camera-guide-space"><div className="v3-camera-square"/></div><img className="v3-camera-collar" src="/figma-v3/collar.png" alt="픽셀 목줄"/>

  </div>}
  {step==='live'&&<div className="v3-capture-live-art"><video ref={video} autoPlay muted playsInline className="v3-camera-video" style={{transform:'scale('+zoom+')'}}/><div className="v3-capture-tip"><button onClick={toggleSound} aria-label={sound?'음원 끄기':'음원 켜기'}><img src={'/figma-v3/sound-'+(sound?'on':'off')+'.png'} alt=""/>음원 {sound?'켜짐':'꺼짐'}</button><p>‘네모칸’ 안에 잘 맞춰 수집해주세요</p></div><div className="v3-camera-guide-space"><div ref={guide} className={'v3-camera-square'+(scan?' is-scanning':'')}/></div><button type="button" className="v3-camera-collar v3-camera-shutter" onClick={capture} disabled={busy||scan} aria-label="사진 촬영"><img src="/figma-v3/collar.png" alt="픽셀 목줄"/></button></div>}
  {step==='edit'&&<div className="v3-capture-edit"><h2>수집한 멍멍이 확인하기</h2><img src={preview} className="v3-capture-photo" alt="촬영한 강아지"/><button className="v3-retry" onClick={restart}>다시 수집 &gt;</button><label>카드 제목<input maxLength={30} value={title} onChange={e=>setTitle(e.target.value)} placeholder={dog.name+'의 소중한 순간'} /></label><small className="v3-capture-title-count">{title.length}/30</small><p>저장하면 모두의 도감에 바로 공개돼요.</p><button className="v3-yellow-btn" disabled={busy||!title.trim()} onClick={save}>{busy?'저장 중…':'카드 저장하고 게시하기'}</button></div>}
  {step==='done'&&<div className="v3-capture-complete"><h2>멍카드 수집 완료!</h2><div className="v3-complete-card">{saved&&<GoReveal initialCue="acquire"><GoCard card={saved} compact/></GoReveal>}</div><Link className="v3-yellow-btn" href={saved?.id?'/go/posts/'+saved.id:'/go/'+dog.id} onClick={end}>내 카드 보러가기</Link></div>}
  {permissionOpen&&<div className="v3-camera-permission" role="dialog" aria-modal="true" aria-label="카메라 사용 안내"><div className="v3-pixel-dialog"><p>카메라 사용을 허용하시겠습니까?</p><GoPixelChoice initial onClick={openCamera}>허용하고 시작하기</GoPixelChoice><GoPixelChoice onClick={end}>아직..</GoPixelChoice></div></div>}
  {error&&<div className="v3-camera-error" role="alert"><p>{error}</p>{cameraError&&<><button type="button" onClick={openCamera}>다시 시도</button><button type="button" onClick={end}>도감으로 돌아가기</button></>}</div>}
 </div>;
}
