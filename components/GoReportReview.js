'use client';
import {useRef,useState} from 'react';
import {REPORT_REASONS} from '../lib/goReport.js';
const labels=Object.fromEntries([...REPORT_REASONS,['privacy','얼굴·개인정보 (이전 사유)'],['wrong_dog','다른 멍멍이 (이전 사유)']]);
export default function GoReportReview({cardId,count}){
 const [reports,setReports]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);const pending=useRef(false);
 async function load(){if(pending.current)return;pending.current=true;setBusy(true);setError('');try{const r=await fetch('/api/admin/go/reports?cardId='+encodeURIComponent(cardId),{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error);setReports(data.reports||[]);}catch(e){setError(e.message);}finally{pending.current=false;setBusy(false);}}
 async function review(row){if(pending.current)return;pending.current=true;setBusy(true);setError('');try{const r=await fetch('/api/admin/go/reports',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({cardId,reporterId:row.member_id})});const data=await r.json();if(!r.ok)throw Error(data.error);setReports(rows=>rows.map(r=>r.member_id===row.member_id?{...r,status:'reviewed'}:r));}catch(e){setError(e.message);}finally{pending.current=false;setBusy(false);}}
 return <details className="go-review-reports" onToggle={e=>{if(e.currentTarget.open&&reports===null)load();}}><summary>신고 내역 {count}건</summary>{busy&&<p role="status">처리 중…</p>}{error&&<p role="alert">{error}<button type="button" onClick={load}>다시 시도</button></p>}{reports?.map(row=><section key={row.member_id}><strong>{labels[row.reason]||row.reason}</strong>{row.reason_detail&&<p>{row.reason_detail}</p>}<time>{new Date(row.created_at).toLocaleString('ko-KR')}</time><p>{row.status==='reviewed'?'검토 완료':'검토 대기'}</p>{row.status!=='reviewed'&&<button type="button" disabled={busy} onClick={()=>review(row)}>검토 완료로 표시</button>}</section>)}</details>;
}
