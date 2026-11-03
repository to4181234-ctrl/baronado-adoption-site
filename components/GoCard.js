'use client';
import { useEffect,useRef,useState } from 'react';
import Link from 'next/link';
import { rejectionText } from '../lib/goShared.js';
import GoPostEditor from './GoPostEditor.js';
import GoCardExport from './GoCardExport.js';
import GoCardViewer from './GoCardViewer.js';
import GoCardFace from './GoCardFace.js';
import GoReport from './GoReport.js';
import {createCompletionSound,COMPLETION_SOUND_KEY,completionSoundEnabled} from '../lib/goCompletionSound.js';

export default function GoCard({card,member,onLogin,onDelete,onUpdated,onCollectionChange,coverCardId=null,compact=false,showTitle=!compact,linkToPost=false,viewOnClick=false,allowCover=false,previewStats=false,revealOnOpen=false,selectMode=false,selected=false,onSelect,onLongPress}){
 const [current,setCurrent]=useState(card),[busy,setBusy]=useState(false),[busyAction,setBusyAction]=useState(''),[reportOpen,setReportOpen]=useState(false),[message,setMessage]=useState(''),[editing,setEditing]=useState(false),[exporting,setExporting]=useState(false),[viewing,setViewing]=useState(false);
 const inFlight=useRef(false),viewerSound=useRef(null);
 const holdTimer=useRef(null),holdTriggered=useRef(false);
 function beginHold(event){if(!onLongPress||(event.pointerType==='mouse'&&event.button!==0))return;holdTriggered.current=false;clearTimeout(holdTimer.current);holdTimer.current=setTimeout(()=>{holdTriggered.current=true;onLongPress();},550);}
 function endHold(){clearTimeout(holdTimer.current);holdTimer.current=null;}
 function cardLinkClick(event){if(holdTriggered.current){event.preventDefault();holdTriggered.current=false;return;}previewPost(event);}
 useEffect(()=>()=>clearTimeout(holdTimer.current),[]);
 function openViewer(){const player=createCompletionSound();viewerSound.current=player;let enabled=true;try{enabled=completionSoundEnabled(localStorage.getItem(COMPLETION_SOUND_KEY));}catch{}if(enabled)player.prepare();setViewing(true);}
 useEffect(()=>{setCurrent(card);},[card]);
 const isOwner=member?.id===current.ownerId;
 function previewPost(event){if(!revealOnOpen||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();openViewer();}
 async function action(path,method='POST',body,endpoint){
  if(!member){onLogin();return null;}if(inFlight.current)return null;inFlight.current=true;setBusy(true);setBusyAction(path);setMessage('');
  try{const r=await fetch(endpoint||`/api/go/cards/${current.id}${path}`,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok)throw new Error(data.error);return data;}
  catch(error){setMessage(error.name==='TimeoutError'?'응답이 늦어지고 있어요. 다시 눌러주세요.':error.message||'잠시 후 다시 시도해주세요.');return null;}
  finally{inFlight.current=false;setBusy(false);setBusyAction('');}
 }
 const face=<div className="go-card go-card-v3">
  <GoCardFace card={current}/>
  {linkToPost&&<Link className="go-card-target" onPointerDown={beginHold} onPointerUp={endHold} onPointerCancel={endHold} onPointerLeave={endHold} onContextMenu={event=>{if(onLongPress)event.preventDefault();}} onClick={cardLinkClick} href={'/go/posts/'+current.id} aria-label={current.title+' 자세히 보기'}/>}
 </div>;
 if(selectMode)return <article className="go-card-entry go-bulk-card-entry"><button type="button" className="go-bulk-card-choice" aria-pressed={selected} aria-label={`${current.dogName} · ${current.title||'나의 카드'} ${selected?'선택 해제':'삭제 대상으로 선택'}`} onClick={()=>onSelect?.(current.id)}><span className="go-bulk-check" aria-hidden="true">{selected?'✓':''}</span>{face}</button></article>;
 return <article className="go-card-entry">{viewOnClick?<button type="button" className="go-card-view-button" onClick={openViewer} aria-label={`${current.dogName} 카드 효과와 함께 보기`}>{face}</button>:linkToPost?<div className="go-card-face-link">{face}</div>:face}{compact&&previewStats&&<div className="go-preview-stats" aria-label={`좋아요 ${current.likeCount||0}개 · 저장·공유 ${current.shareCount||0}회`}><span>♡ {current.likeCount||0}</span><span>저장·공유 {current.shareCount||0}</span></div>}{!compact&&<div className="go-card-outside">{current.status!=='approved'&&<p className="go-status">{current.status==='pending'?'공개 준비 중':current.status==='rejected'?`비공개 · ${rejectionText(current)}`:'비공개 처리'}</p>}<div className="go-card-tools"><button type="button" onClick={()=>member?setExporting(true):onLogin?.()}>이미지 저장·공유</button>{isOwner&&allowCover&&<button type="button" disabled={busy||coverCardId===current.id} onClick={async()=>{if(await action('/cover','PATCH',{dogId:current.dogId,cardId:current.id},'/api/go/collection')){setMessage('이 사진을 도감 썸네일로 지정했어요.');onCollectionChange?.();}}}>{coverCardId===current.id?'도감 썸네일로 사용 중':'도감 썸네일 지정'}</button>}</div><div className="go-post-actions">{current.status==='approved'&&<span className="go-share-count" aria-label={`저장·공유 ${current.shareCount||0}회`}>저장·공유 {current.shareCount||0}</span>}{current.status==='approved'&&<button type="button" className="go-like-button" aria-label={`${current.dogName} 카드 좋아요 ${current.likeCount}개`} aria-pressed={Boolean(current.liked)} aria-busy={busy&&busyAction==='/like'} disabled={busy} onClick={async()=>{const data=await action('/like','POST',{liked:!current.liked});if(data)setCurrent(previous=>({...previous,...data}));}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/></svg>{current.liked&&<span className="go-like-burst" aria-hidden="true">♥</span>}<span>좋아요 {current.likeCount}</span></button>}<div className="go-secondary-actions">{isOwner?<><button type="button" disabled={busy} onClick={()=>{setEditing(true);setMessage('');}}>게시물 수정</button><button type="button" className="go-delete-action" disabled={busy} onClick={async()=>{if(confirm('이 카드를 삭제할까요? 삭제 후에는 복구할 수 없어요.')&&await action('','DELETE'))onDelete?.(current.id);}}>삭제</button></>:current.status==='approved'&&<button type="button" onClick={()=>member?setReportOpen(!reportOpen):onLogin()}>신고</button>}</div></div>{reportOpen&&<GoReport cardId={current.id} onClose={()=>setReportOpen(false)} onSubmitted={()=>{setReportOpen(false);setMessage('신고가 접수됐어요.');}}/>}{message&&<p className="go-note" role="status">{message}</p>}</div>}{viewing&&<GoCardViewer card={current} member={member} onLogin={onLogin} onCardChanged={changed=>setCurrent(previous=>({...previous,...changed}))} preparedSound={viewerSound.current} onClose={()=>setViewing(false)}/>}{editing&&<GoPostEditor card={current} onClose={()=>setEditing(false)} onSaved={updated=>{setCurrent(updated);setEditing(false);setMessage('수정 내용을 저장했어요.');onUpdated?.(updated);onCollectionChange?.();}}/>}{exporting&&<GoCardExport card={current} onRecorded={count=>setCurrent(previous=>({...previous,shareCount:Math.max(previous.shareCount||0,count)}))} onClose={()=>setExporting(false)}/>}</article>;
}
