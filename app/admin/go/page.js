'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminGuard from '../../../components/AdminGuard.js';
import SiteHeader from '../../../components/SiteHeader.js';

function ReviewPage() {
  const [cards, setCards] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [view, setView] = useState('pending');
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const load = useCallback(async (nextPage = 0) => {
    try {
      const response = await fetch(`/api/admin/go/cards?status=${view}&page=${nextPage}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCards(previous => nextPage ? [...previous, ...data.cards] : data.cards);
      setMore(data.hasMore); setPage(nextPage);
    } catch (e) { setError(e.message || '카드를 불러오지 못했어요.'); }
  }, [view]);
  useEffect(() => { load(); }, [load]);
  async function review(id, status) {
    setBusy(id); setError('');
    try {
      const response = await fetch('/api/admin/go/cards', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCards(previous => previous.filter(card => card.id !== id));
    } catch (e) { setError(e.message || '검토에 실패했어요.'); }
    finally { setBusy(''); }
  }
  return <main className="site-shell"><SiteHeader /><section className="container go-container"><Link href="/admin" className="back-link">관리자 목록</Link><h1>멍멍GO 카드 검토</h1><p className="go-note">강아지가 보이는지, 사람 얼굴이나 차량번호가 포함되지 않았는지 확인하고 승인해주세요.</p>
    <div className="go-tabs" role="group" aria-label="검토 상태"><button className={view === 'pending' ? 'active' : ''} onClick={() => setView('pending')}>승인 대기</button><button className={view === 'approved' ? 'active' : ''} onClick={() => setView('approved')}>공개 카드 관리</button></div>
    {error && <p className="go-error">{error}</p>}
    {!cards.length && <p className="go-empty">검토할 카드가 없어요.</p>}
    <div className="go-card-grid">{cards.map(card => <article className="go-review" key={card.id}><img src={card.imageUrl} alt={`${card.dogName} 카드 검토`} /><div><strong>{card.dogName} · {card.nickname}</strong><p>{card.description || '설명 없음'}</p><small>{new Date(card.capturedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</small>{card.reportCount > 0 && <p className="go-error">신고 {card.reportCount}건 · 사진을 다시 확인해주세요</p>}</div><div className="go-review-actions">{view === 'pending' && <button disabled={busy === card.id} onClick={() => review(card.id, 'approved')}>공개 승인</button>}<button disabled={busy === card.id} onClick={() => review(card.id, view === 'pending' ? 'rejected' : 'hidden')}>{view === 'pending' ? '반려' : '공개 중지'}</button></div></article>)}</div>
    {more && <button className="go-more" onClick={() => load(page + 1)}>더 보기</button>}
  </section></main>;
}

export default function Page() { return <AdminGuard><ReviewPage /></AdminGuard>; }
