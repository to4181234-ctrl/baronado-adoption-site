'use client';
import {useEffect,useRef,useState} from 'react';
import {validatePostEdit} from '../lib/goPostEdit.js';
export default function GoPostEditor({card,onClose,onSaved}){
 const [title,setTitle]=useState(card.title||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef(false),input=useRef(null);
 useEffect(()=>{const before=document.activeElement;input.current?.focus();return()=>before?.focus?.();},[]);
 async function save(e){e.preventDefault();if(pending.current)return;let edit;try{edit=validatePostEdit({title});}catch(e){setError(e.message);return;}pending.current=true;setBusy(true);setError('');try{const r=await fetch(`/api/go/cards/${card.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(edit)});const data=await r.json();if(!r.ok||!data.card)throw Error(data.error||'수정하지 못했어요.');onSaved(data.card);}catch(e){setError(e.message);}finally{pending.current=false;setBusy(false);}}
 return <div className="go-overlay" role="dialog" aria-modal="true" aria-label="카드 제목 수정" onKeyDown={e=>{if(e.key==='Escape'&&!busy)onClose();}}><div className="go-dialog go-title-editor"><button type="button" className="go-close" disabled={busy} onClick={onClose} aria-label="닫기">×</button><h2>카드 제목 수정</h2><form onSubmit={save}><label className="go-description">카드 제목<input ref={input} required maxLength={30} value={title} onChange={e=>setTitle(e.target.value)} /></label><small>{title.length}/30</small>{error&&<p className="go-error" role="alert">{error}</p>}<button type="submit" className="go-primary" disabled={busy||!title.trim()}>{busy?'저장 중…':'수정 저장'}</button></form></div></div>;
}
