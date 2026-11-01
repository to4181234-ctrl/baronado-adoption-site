'use client';
import {useState} from 'react';
import {REPORT_REASONS,validateReport} from '../lib/goReportRules.mjs';
export default function GoReportForm({cardId,onSuccess,onClose}){
 const [reason,setReason]=useState(''),[detail,setDetail]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(event){event.preventDefault();setError('');let payload;try{payload=validateReport(reason,detail)}catch(e){setError(e.message);return}setBusy(true);
  try{const res=await fetch(`/api/go/cards/${cardId}/report`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await res.json();if(!res.ok)throw new Error(result.error||'신고를 접수하지 못했어요.');onSuccess?.()}catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <form className="v3-report-form" onSubmit={submit} aria-label="공개 카드 신고">
  <strong>신고 이유</strong>{REPORT_REASONS.map(([value,label])=><label key={value}><input type="radio" checked={reason===value} onChange={()=>setReason(value)} name="report-reason" disabled={busy}/>{label}</label>)}
  {reason==='other'&&<label className="v3-report-detail">기타 사유 (10~300자)<textarea rows={4} minLength={10} maxLength={300} value={detail} onChange={e=>setDetail(e.target.value)} disabled={busy} required/></label>}
  {error&&<p role="alert" className="v3-error">{error}</p>}
  <div className="v3-report-actions"><button type="submit" disabled={busy||!reason||reason==='other'&&(detail.trim().length<10||detail.trim().length>300)}>{busy?'접수 중…':'신고 접수'}</button><button type="button" onClick={onClose} disabled={busy}>취소</button></div>
 </form>;
}
