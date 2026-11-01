'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {useParams,useRouter} from 'next/navigation';
import AdminGuard from '../../../../../components/AdminGuard.js';
import SiteHeader from '../../../../../components/SiteHeader.js';
import {REPORT_REASONS} from '../../../../../lib/goReportRules.mjs';
const REASONS=Object.fromEntries(REPORT_REASONS);
function CardDetails(){
 const {id}=useParams(),router=useRouter();const [card,setCard]=useState(null),[reports,setReports]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{const response=await fetch('/api/admin/go/card/'+id,{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'카드를 불러오지 못했어요.');setCard(data.card);setReports(data.reports||[])}catch(e){setError(e.message)}finally{setLoading(false)}},[id]);useEffect(()=>{load()},[load]);
 async function change(action){if(busy)return;const message=action==='delete'?'이 카드를 영구 삭제할까요? 관련 이미지·좋아요·신고도 삭제됩니다.':action==='hide'?'이 카드의 공개를 중지할까요?':'이 카드를 다시 공개할까요?';if(!window.confirm(message))return;setBusy(true);setError('');try{const r=await fetch('/api/admin/go/card/'+id,{method:action==='delete'?'DELETE':'PATCH',headers:{'Content-Type':'application/json'},body:action==='delete'?undefined:JSON.stringify({action})});const data=await r.json();if(!r.ok)throw Error(data.error||'처리할 수 없어요.');if(action==='delete'){router.push('/admin/go');return}setNotice('노출 상태를 변경했어요.');await load()}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <main className="site-shell v3-site v3-admin-card-detail-site"><SiteHeader/><section className="v3-admin-card-detail"><Link href="/admin/go" className="v3-back">‹ 카드 게시물 관리</Link><h1>카드 게시물 상세</h1>{error&&<p className="v3-error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}{loading?<p>카드를 불러오는 중이에요.</p>:card&&<>
  <img src={card.imageUrl} alt={`${card.dogName} 촬영 사진`} className="v3-admin-card-detail-photo"/><h2>{card.title}</h2><p>{card.dogName} · {card.nickname}</p><p>발급일: {card.capturedAt?new Date(card.capturedAt).toLocaleDateString('ko-KR'):''}</p><p>노출 상태: {card.status==='approved'?'게시 중':'관리자 숨김'}</p><p>속성: {card.battle?.element||'미확인'} · 파워 {card.battle?.power??'미확인'} · 애교 {card.battle?.charm??'미확인'}</p>
  <h2>신고 내역</h2>{reports.length===0?<p>신고 내역이 없어요.</p>:reports.map((r,index)=><div key={index} className="v3-admin-report"><p>{REASONS[r.reason]||r.reason}</p>{r.detail&&<p>{r.detail}</p>}<small>{r.review_status==='completed'?'처리 완료':'처리 대기'}</small></div>)}
  <div className="v3-admin-card-detail-actions"><button disabled={busy} onClick={()=>change(card.status==='approved'?'hide':'restore')}>{card.status==='approved'?'숨김':'다시 공개'}</button><button disabled={busy} onClick={()=>change('delete')}>삭제</button><Link href="/admin/go/reports">신고 확인</Link></div>
 </>}</section></main>
}
export default function AdminCardDetailPage(){return <AdminGuard><CardDetails/></AdminGuard>}
