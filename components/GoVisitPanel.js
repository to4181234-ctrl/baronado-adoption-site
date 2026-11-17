'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGoSession } from './GoShell.js';
import { useGoCoins } from './GoCoins.js';
import { VISIT_REJECTION_REASONS } from '../lib/goVisit.js';

const formatTime = value => new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit',
  day: '2-digit', hour: '2-digit', minute: '2-digit'
}).format(new Date(value));
function leftSeconds(value, now) {
  return Math.max(0, Math.ceil((Date.parse(value || '') - now) / 1000) || 0);
}

export default function GoVisitPanel({ embedded=false }={}) {
  const { member, ready, openAccount } = useGoSession();
  const coins = useGoCoins();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const previousStatus = useRef(null);

  const reload = useCallback(async () => {
    if (!coins?.enabled || !member) return;
    try {
      const response = await fetch('/api/go/visit', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || '인증 내역을 불러오지 못했어요.');
      const nextStatus = data.request?.status || null;
      if (previousStatus.current === 'pending' && nextStatus === 'approved') {
        window.dispatchEvent(new Event('go-coins-changed'));
      }
      previousStatus.current = nextStatus;
      setState(data);
      setError('');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [member?.id, coins?.enabled]);

  useEffect(() => {
    if (!member || !coins?.enabled) return;
    setLoading(true);
    reload();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const refresh = window.setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, 10000);
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer); window.clearInterval(refresh);
      window.removeEventListener('focus', onFocus);
    };
  }, [member?.id, coins?.enabled, reload]);

  async function submit(action) {
    if (busy) return;
    if (!member) { openAccount(); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/go/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, requestId: state?.request?.id })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw Error(data.error || '인증을 처리하지 못했어요.');
      if (action === 'request') previousStatus.current = 'pending';
      await reload();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  if (!coins?.enabled) return null;

  const item = state?.request;
  const remain = leftSeconds(item?.expiresAt, now);
  const isPending = item?.status === 'pending' && remain > 0;
  const waitForRetry = item?.status === 'rejected' ? leftSeconds(item.retryAt, now) : 0;
  const todayDone = Boolean(coins.daily?.visitQuestDone);
  if(embedded) {
    const statusExpired=item?.status==='expired'||(item?.status==='pending'&&remain===0);
    return <div className="go-visit-dialog-content">
      <h2>바로나도에 놀러왔개</h2>
      <p className="go-visit-dialog-reward">+30 멍코인</p>
      <div className="go-visit-dialog-desc">
        <p>바로나도에서 음료를 주문하셨나요?<br/>직원에게 인증을 요청해주세요.<br/>음료 구매가 확인되면 30 멍코인을 드려요!</p>
        <small>*계정당 1일 1회 가능*</small>
      </div>
      {error&&<p className="go-visit-dialog-error" role="alert">{error}</p>}
      {todayDone ? <>
        <p className="go-visit-dialog-status">인증 완료!</p>
        <p className="go-visit-dialog-sub">오늘의 30 멍코인이 지급됐어요.</p>
        <button type="button" className="go-visit-dialog-submit" disabled>오늘 인증 완료</button>
      </> : isPending ? <>
        <p className="go-visit-dialog-status" role="timer">{Math.floor(remain/60)} : {String(remain%60).padStart(2,'0')}</p>
        {item.code&&<small className="go-visit-dialog-code">직원 확인 코드: {item.code}</small>}
        <button type="button" className="go-visit-dialog-submit" disabled>직원에게 인증 신청 보내기</button>
      </> : <>
        <p className="go-visit-dialog-status">{statusExpired?'인증 시간 종료':item?.status==='rejected'?'인증 반려':(!state?.canRequestNow&&state?'신청 시간 외':'')}</p>
        {item?.status==='rejected'&&<small className="go-visit-dialog-sub">{VISIT_REJECTION_REASONS[item.rejectedReason]||'직원에게 확인해 주세요.'}</small>}
        <button type="button" className="go-visit-dialog-submit"
          disabled={!member||busy||loading||!state?.canRequestNow||waitForRetry>0}
          onClick={()=>{if(!member){openAccount();return}submit('request')}}>
          {busy?'신청 중…':statusExpired?'인증 신청 다시 보내기':'직원에게 인증 신청 보내기'}
        </button>
        {state&&!state.canRequestNow&&<small className="go-visit-dialog-sub">신청 가능 시간은 매일 오전 9시부터 오후 9시 전까지예요.</small>}
        {waitForRetry>0&&<small className="go-visit-dialog-sub">{waitForRetry}초 뒤 재신청 가능</small>}
      </>}
    </div>;
  }
  return <article className="go-visit-screen">
    <Link className="v3-back" href="/go/quests">‹ 오늘의 퀘스트</Link>
    <h1>방문 인증</h1>
    <p className="go-visit-lead">바로나도에 방문해 음료를 구매했다면,<br/>
      직원에게 인증코드를 보여주세요.</p>
    <div className="go-visit-reward">
      <span>일일 퀘스트 보상</span><b>+30C</b>
    </div>
    {!member ? <section className="go-visit-box">
      <p>{ready ? '로그인하면 방문 인증을 신청할 수 있어요.' : '로그인 확인 중…'}</p>
      {ready && <button onClick={openAccount}>로그인하기</button>}
    </section> : <>
      {error && <p className="go-coin-error" role="alert">{error}</p>}
      {todayDone ? <section className="go-visit-box">
        <h2>오늘의 방문 퀘스트 완료!</h2>
        <p>인증이 완료되었어요. 내일 다시 참여할 수 있어요.</p>
      </section> : isPending ? <section className="go-visit-box">
        <h2>직원에게 이 코드를 보여주세요</h2>
        <output className="go-visit-code" aria-label={'방문 인증코드 ' + item.code}>{item.code}</output>
        <p className="go-visit-countdown">남은 시간 {Math.floor(remain / 60)}:{String(remain % 60).padStart(2, '0')}</p>
        <small>만료 시각: {formatTime(item.expiresAt)} (한국 시간)</small>
        <p>직원이 음료 구매를 확인한 뒤 승인하면 자동으로 30C가 지급돼요.</p>
        <button className="go-visit-cancel" disabled={busy} onClick={() => submit('cancel')}>
          {busy ? '처리 중…' : '신청 취소'}
        </button>
      </section> : <section className="go-visit-box">
        {item?.status === 'rejected' ? <>
          <h2>인증이 반려되었어요</h2>
          <p>{VISIT_REJECTION_REASONS[item.rejectedReason] || '직원에게 확인해 주세요.'}</p>
          {waitForRetry > 0 && <small>{waitForRetry}초 뒤 재신청 가능</small>}
        </> : <h2>인증코드 발급</h2>}
        {item?.status === 'expired' && <p>이전 코드가 만료되었어요. 다시 신청할 수 있어요.</p>}
        {item?.status === 'cancelled' && <p>이전 신청을 취소했어요. 필요하면 새 코드를 발급받으세요.</p>}
        {item?.status === 'reversed' && <p>승인 기록이 정정되었어요. 다시 신청할 수 있어요.</p>}
        {loading && <p role="status">인증 현황 확인 중…</p>}
        <button type="button" disabled={busy || loading || !state?.canRequestNow || waitForRetry > 0}
          onClick={() => submit('request')}>{busy ? '발급 중…' : '인증코드 발급하기'}</button>
        {state && !state.canRequestNow && <p className="go-visit-tip">
          신청 가능 시간은 매일 오전 9시부터 오후 9시 이전까지예요.
        </p>}
      </section>}
    </>}
    <p className="go-visit-tip">하루 한 번, 직접 방문해 음료를 구매한 경우에만 인증할 수 있어요.
      직원 확인 전에는 코인이 지급되지 않아요.</p>
  </article>;
}
