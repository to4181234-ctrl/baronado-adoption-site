'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import AdminGuard from '../../../../components/AdminGuard.js';
import SiteHeader from '../../../../components/SiteHeader.js';
import {REPORT_REASONS} from '../../../../lib/goReportRules.mjs';
const reasons=Object.fromEntries(REPORT_REASONS);
function Reports(){
 const [handled,setHandled]=useState(false),[page,setPage]=useState(0),[input,setInput]=useState(''),[query,setQuery]=useState(''),[reports,setReports]=useState([]),[total,setTotal]=useState(0),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{const p=new URLSearchParams({handled:handled?'1':'0',page:String(page),q:query});const res=await fetch('/api/admin/go/reports?'+p,{cache:'no-store'});const d=await res.json();if(!res.ok)throw Error(d.error||'신고를 조회하지 못했어요.');setReports(d.reports||[]);setTotal(d.total||0)}catch(e){setError(e.message)}finally{setLoading(false)}},[handled,page,query]);
 useEffect(()=>{load()},[load]);
 async function review(item,action){if(busy)return;const message=action==='delete'?'이 카드를 완전히 삭제할까요? 사진과 관련 데이터도 삭제됩니다.':action==='hide'?'검토 후 이 카드의 공개를 중지할까요?':'신고에 문제가 없다고 판단했나요?';if(!confirm(message))return;setBusy(true);setError('');setNotice('');
  try{const res=await fetch('/api/admin/go/reports',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({cardId:item.card_id,memberId:item.member_id,action})});const d=await res.json();if(!res.ok)throw Error(d.error||'신고를 처리하지 못했어요.');setNotice('처리 기록을 저장했어요.'+(d.cleanupPending?' 이미지 파일 정리가 지연 중이에요.':''));await load()}catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <main className="site-shell v3-site v3-admin-reports-site"><SiteHeader/><section className="v3-admin-reports">
  <Link href="/admin/go" className="v3-back">‹ 관리 메뉴</Link><h1>신고 확인</h1><p className="v3-admin-subtitle">신고 내용과 실제 카드를 함께 확인해요.</p><div className="v3-report-tabs"><button onClick={()=>{setHandled(false);setPage(0)}} aria-pressed={!handled}>처리 대기</button><button onClick={()=>{setHandled(true);setPage(0)}} aria-pressed={handled}>처리 완료</button></div>
  <form onSubmit={e=>{e.preventDefault();setPage(0);setQuery(input.trim())}}><input aria-label="신고 검색" placeholder="제목·작성자·강아지 이름 검색" value={input} maxLength={80} onChange={e=>setInput(e.target.value)}/><button>검색</button></form>
  {error&&<p className="v3-error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}{loading?<p>신고를 확인하고 있어요.</p>:reports.length===0?<p>해당하는 신고가 없어요.</p>:reports.map((r,i)=><article key={r.card_id+':'+r.member_id} className="v3-admin-report">{r.card?<Link href={'/admin/go/card/'+r.card_id}><strong>{r.card.title}</strong></Link>:<strong>삭제된 게시물</strong>}<p>{r.card?.dog_name||'강아지 정보 없음'} · {r.card?.nickname||'작성자 정보 없음'}</p><p>신고 이유: {reasons[r.reason]||r.reason}</p>{r.reason==='other'&&<p className="v3-admin-report-detail">{r.detail}</p>}<small>{new Date(r.created_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</small>{!handled&&<div className="v3-report-actions"><button disabled={busy} onClick={()=>review(r,'no_issue')}>문제 없음</button><button disabled={busy} onClick={()=>review(r,'hide')}>숨김</button><button disabled={busy} onClick={()=>review(r,'delete')}>삭제</button></div>}</article>)}
  <nav className="v3-admin-pages" aria-label="신고 목록 페이지"><button disabled={loading||page===0} onClick={()=>setPage(p=>p-1)}>이전</button><span>{page+1} / {Math.max(1,Math.ceil(total/5))}</span><button disabled={loading||(page+1)*5>=total} onClick={()=>setPage(p=>p+1)}>다음</button></nav>
 </section></main>
}
export default function ReportsPage(){return <AdminGuard><Reports/></AdminGuard>}
