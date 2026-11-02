'use client';
import {useEffect,useRef,useState} from 'react';
import {REPORT_REASONS,validateReport} from '../lib/goReport.js';
export default function GoReport({cardId,onClose,onSubmitted}){
 const [reason,setReason]=useState(''),[details,setDetails]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef(false),back=useRef(null);
 useEffect(()=>{const before=document.activeElement;back.current?.focus();return()=>before?.focus?.();},[]);
 async function submit(e){e.preventDefault();if(pending.current)return;let report;try{report=validateReport({reason,details});}catch(e){setError(e.message);return;}
  pending.current=true;setBusy(true);setError('');try{const r=await fetch(`/api/go/cards/${cardId}/report`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});const data=await r.json();if(!r.ok)throw Error(data.error||'신고를 접수하지 못했어요.');onSubmitted();}catch(e){setError(e.message);}finally{pending.current=false;setBusy(false);}
 }
 const valid=reason&&(reason!=='other'||details.trim().length>=10&&details.trim().length<=300);
 return <section className="v10-report-screen" role="dialog" aria-modal="true" aria-labelledby="report-title" onKeyDown={e=>{if(e.key==='Escape'&&!busy){e.stopPropagation();onClose();}}}>
  <button ref={back} type="button" className="v10-report-back" disabled={busy} onClick={onClose}>‹ 뒤로</button><h2 id="report-title">신고 사유를 알려주세요</h2>
  <form onSubmit={submit}><fieldset disabled={busy}><legend className="v10-sr-only">신고 사유</legend>{REPORT_REASONS.map(([key,label])=><label className="v10-report-option" key={key}><input type="radio" name="report-reason" value={key} checked={reason===key} onChange={()=>{setReason(key);setError('');}}/><span aria-hidden="true">{reason===key?'●':'○'}</span> {label}</label>)}</fieldset>
   {reason==='other'&&<label className="v10-report-details"><span className="v10-sr-only">상세 사유</span><textarea aria-label="상세 사유" placeholder="상세 사유를 적어주세요. (10~300자)" maxLength={300} value={details} disabled={busy} onChange={e=>setDetails(e.target.value)}/></label>}
   {error&&<p className="go-error" role="alert">{error}</p>}
   <button type="submit" className="v10-report-submit" disabled={busy||!valid}>{busy?'접수 중…':'신고 접수'}</button>
  </form>
 </section>;
}
