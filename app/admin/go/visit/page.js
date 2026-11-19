'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminGuard from '../../../../components/AdminGuard.js';
import SiteHeader from '../../../../components/SiteHeader.js';
import { VISIT_REJECTION_REASONS } from '../../../../lib/goVisit.js';

const koreanDate=value=>value?new Intl.DateTimeFormat('ko-KR',{
  timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'
}).format(new Date(value)):'—';
const statusLabel={
  pending:'승인 대기',approved:'승인 완료',rejected:'반려',
  cancelled:'사용자 취소',expired:'기간 만료',reversed:'승인 회수'
};
function VisitReview(){
  const [history,setHistory]=useState(false);
  const [codeInput,setCodeInput]=useState('');
  const [code,setCode]=useState('');
  const [page,setPage]=useState(0);
  const [result,setResult]=useState({requests:[],total:0,hasMore:false});
  const [selected,setSelected]=useState(null);
  const [reason,setReason]=useState('no_purchase');
  const [reverseReason,setReverseReason]=useState('');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const reload=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const params=new URLSearchParams({page:String(page)});
      if(history)params.set('history','1');
      if(code)params.set('code',code);
      const response=await fetch('/api/admin/go/visit?'+params.toString(),{cache:'no-store'});
      const data=await response.json();
      if(!response.ok)throw Error(data.error||'인증 목록을 불러오지 못했어요.');
      setResult(data);
    }catch(e){setError(e.message);}finally{setLoading(false);}
  },[history,code,page]);
  useEffect(()=>{reload();},[reload]);

  async function review(action){
    if(!selected||busy)return;
    const msg=action==='approve'?'음료 구매를 확인했고 30C를 지급할까요?':
      action==='reject'?'이 인증 요청을 반려할까요?':
      '잘못 승인한 30C를 회수할까요? 잔액 부족 시 회수하지 않고 기록만 남아요.';
    if(!window.confirm(msg))return;
    setBusy(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/admin/go/visit',{
        method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:selected.id,action,
          reason:action==='reject'?reason:action==='reverse'?reverseReason:null})
      });
      const data=await response.json();
      if(!response.ok)throw Error(data.error||'요청을 처리하지 못했어요.');
      setNotice(action==='approve'?'승인하고 30C를 지급했어요.':
        action==='reject'?'인증을 반려했어요.':'승인 코인 30C를 회수했어요.');
      setSelected(null);setReverseReason('');await reload();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }

  const rows=result.requests||[];
  return <main className="site-shell v3-site v10-admin-cards"><SiteHeader/>
    <section className="v10-admin-content">
      
      <header className="v10-admin-heading"><h1>방문 인증 관리</h1>
        <p>현장에서 음료 구매를 확인한 후 멍코인 30C를 승인해 주세요.</p>
      </header>
      {error&&<p className="v3-error" role="alert">{error}</p>}
      {notice&&<p role="status">{notice}</p>}

      <form className="v10-admin-search" onSubmit={e=>{
        e.preventDefault();setCode(codeInput.trim().toUpperCase());setPage(0);setSelected(null);
      }}>
        <input aria-label="숫자 6자리 방문 인증 코드 검색" placeholder="인증 코드 숫자 6자리"
          maxLength={6} value={codeInput} onChange={e=>setCodeInput(e.target.value)}/>
        <button type="submit">검색</button>
      </form>
      <div className="v10-admin-tabs" role="group" aria-label="인증 상태 보기">
        <button type="button" className={!history?'active':''} onClick={()=>{
          setHistory(false);setPage(0);setSelected(null);
        }}>승인 대기</button>
        <button type="button" className={history?'active':''} onClick={()=>{
          setHistory(true);setPage(0);setSelected(null);
        }}>최근 90일</button>
        <button type="button" onClick={reload} disabled={loading}>새로고침</button>
      </div>
      <p className="v10-admin-note">총 {result.total||0}건 · 최신 신청순 · 코인 지급은 계정당 하루 한 번만 가능해요.</p>

      {loading?<p role="status">인증 목록을 불러오는 중이에요.</p>:
        rows.length===0?<p className="v10-admin-note">조회된 방문 인증이 없어요.</p>:
        <div className="v10-admin-card-list">{rows.map(item=>
          <article key={item.id}>
            <button type="button" className="v10-admin-card-row"
              onClick={()=>{setSelected(item);setReason('no_purchase');setReverseReason('');setNotice('');}}>
              <span>
                <strong>{item.code}</strong>
                <small>{item.nickname} · {statusLabel[item.status]||item.status}</small>
                <small>신청 {koreanDate(item.created_at)} / 만료 {koreanDate(item.expires_at)}</small>
              </span><b aria-hidden="true">›</b>
            </button>
          </article>)}</div>}
      <nav className="v10-admin-pager" aria-label="인증 목록 페이지">
        <button type="button" disabled={loading||page===0}
          onClick={()=>{setPage(p=>p-1);setSelected(null);}}>이전</button>
        <span>{page+1}페이지</span>
        <button type="button" disabled={loading||!result.hasMore}
          onClick={()=>{setPage(p=>p+1);setSelected(null);}}>다음</button>
      </nav>

      {selected&&<article className="v10-admin-detail" aria-label="인증 상세">
        <h2>인증 상세 — {selected.code}</h2>
        <dl>
          <div><dt>회원</dt><dd>{selected.nickname}</dd></div>
          <div><dt>상태</dt><dd>{statusLabel[selected.status]||selected.status}</dd></div>
          <div><dt>만료 시각</dt><dd>{koreanDate(selected.expires_at)}</dd></div>
          {selected.rejected_reason&&<div><dt>반려 사유</dt>
            <dd>{VISIT_REJECTION_REASONS[selected.rejected_reason]||'확인 불가'}</dd></div>}
        </dl>
        {selected.status==='pending'&&<div className="v10-admin-detail-actions">
          <button type="button" disabled={busy} onClick={()=>review('approve')}>
            현장 확인 후 30C 지급
          </button>
          <label>반려 사유
            <select aria-label="반려 사유" value={reason} onChange={e=>setReason(e.target.value)}>
              {Object.entries(VISIT_REJECTION_REASONS).map(([key,label])=>
                <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <button type="button" disabled={busy} onClick={()=>review('reject')}>반려</button>
        </div>}
        {selected.status==='approved'&&<div className="v10-admin-detail-actions">
          <label>잘못 승인한 사유
            <textarea aria-label="코인 회수 사유" value={reverseReason} maxLength={300}
              onChange={e=>setReverseReason(e.target.value)}/>
          </label>
          <button type="button" disabled={busy||reverseReason.trim().length<2}
            onClick={()=>review('reverse')}>잘못된 승인 30C 회수</button>
        </div>}
        <p className="v10-admin-note">회수·반려·승인 이력은 서버에 보존돼요. 인증 요청은 생성 후 30분까지 처리할 수 있어요.</p>
        <button type="button" onClick={()=>setSelected(null)}>상세 닫기</button>
      </article>}
    </section>
  </main>;
}
export default function Page(){return <AdminGuard><VisitReview/></AdminGuard>;}
