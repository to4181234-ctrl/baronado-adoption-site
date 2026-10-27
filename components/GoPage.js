'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { fetchDogs } from '../lib/dogs.js';
import SiteHeader from './SiteHeader.js';
import GoCard from './GoCard.js';
import GoCamera from './GoCamera.js';
import GoAccount from './GoAccount.js';

export default function GoPage({ dogId = null }) {
  const [dogs, setDogs] = useState([]);
  const [member, setMember] = useState(null);
  const [tab, setTab] = useState('mine');
  const [order, setOrder] = useState('newest');
  const [cards, setCards] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAccount, setShowAccount] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const dog = dogs.find(item => item.id === dogId);

  useEffect(() => {
    fetchDogs('adoption').then(setDogs).catch(() => setError('친구 목록을 불러오지 못했어요.'));
    fetch('/api/go/session', { cache: 'no-store' }).then(r => r.json()).then(data => setMember(data.member)).catch(() => {});
  }, []);

  const load = useCallback(async (nextPage = 0) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ order, page: String(nextPage) });
      if (dogId) params.set('dog', dogId);
      if (tab === 'mine' && member) params.set('mine', '1');
      if (tab === 'mine' && !member) { setCards([]); setHasMore(false); return; }
      const response = await fetch(`/api/go/cards?${params}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '카드를 가져오지 못했어요.');
      setCards(previous => nextPage ? [...previous, ...data.cards] : data.cards);
      setHasMore(data.hasMore); setPage(nextPage);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [member, tab, order, dogId]);

  useEffect(() => { load(0); }, [load]);
  const accountChanged = (value, keepOpen = false) => { setMember(value); if (value && !keepOpen) setShowAccount(false); setTab(value ? 'mine' : 'all'); };
  const openCamera = () => { if (!member) { setShowAccount(true); return; } setShowCamera(true); };

  return <main className="site-shell"><SiteHeader /><section className="container go-container">
    <Link className="back-link" href={dogId ? '/go' : '/'}>{dogId ? '멍멍GO 도감' : '바로나도 홈'}</Link>
    <div className="go-hero"><span className="go-eyebrow">BARONADO FIELD JOURNAL</span><h1>멍멍GO 🐾</h1><p>오늘 만난 친구의 순간을 카드 한 장으로 남겨요.</p></div>
    {dogId ? dog ? <div className="go-dog-title"><div className="go-dog-avatar">{dog.images?.[0] && <img src={dog.images[0]} alt="" />}</div><div><h2>{dog.name}의 파일</h2><p>{dog.adopted ? '가족을 만났어요 · 지난 기록을 볼 수 있어요' : '현장에서 만나고 사진을 남겨주세요'}</p></div></div> : <p>친구를 불러오는 중이에요.</p> : <><div className="go-section-title"><h2>친구 파일</h2><span>{dogs.length}명의 친구</span></div><div className="go-dog-grid">{dogs.map(item => <Link className="go-dog-tile" href={`/go/${item.id}`} key={item.id}><div>{item.images?.[0] && <img src={item.images[0]} alt="" />}{item.adopted && <span>입양 완료</span>}</div><strong>{item.name}</strong><small>파일 열기 ↗</small></Link>)}</div></>}
    <div className="go-collection-head"><h2>{dog ? `${dog.name} 카드` : '사진 카드'}</h2>{dog && !dog.adopted && <button className="go-primary" onClick={openCamera}>＋ 현장에서 촬영</button>}</div>
    <div className="go-toolbar"><div className="go-tabs" role="group" aria-label="카드 보기"><button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>내 도감</button><button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>모두의 카드</button></div>{tab === 'all' && <select aria-label="카드 게시물 순서" value={order} onChange={event => setOrder(event.target.value)}><option value="newest">최신순</option><option value="oldest">오래된순</option></select>}</div>
    {!member && tab === 'mine' && <div className="go-empty"><p>닉네임으로 내 도감을 만들고, 만난 친구의 카드를 모아보세요.</p><button className="go-primary" onClick={() => setShowAccount(true)}>도감 만들기 / 로그인</button></div>}
    {error && <p className="go-error" role="alert">{error}</p>}
    {cards.length > 0 && <div className="go-card-grid">{cards.map(card => <GoCard key={card.id} card={card} member={member} onLogin={() => setShowAccount(true)} onDelete={id => setCards(previous => previous.filter(item => item.id !== id))} />)}</div>}
    {!loading && cards.length === 0 && (member || tab === 'all') && <div className="go-empty">아직 카드가 없어요. 친구를 만나 첫 기록을 남겨주세요.</div>}
    {loading && <p className="go-note">카드를 불러오는 중이에요…</p>}
    {hasMore && !loading && <button className="go-more" onClick={() => load(page + 1)}>카드 더 보기</button>}
    {member ? <GoAccount member={member} onChange={accountChanged} /> : <button className="go-account-link" onClick={() => setShowAccount(true)}>내 도감 로그인 · 닉네임 만들기</button>}
    <p className="go-footnote">강아지를 쫓거나 놀라게 하지 말고, 플래시 없이 편안한 거리에서 촬영해주세요. 촬영 화면은 카메라만 사용하며 방문 위치를 자동 인증하지는 않아요.</p>
  </section>
    {showAccount && <div className="go-overlay" role="dialog" aria-modal="true" aria-label="도감 계정"><div className="go-dialog"><button className="go-close" onClick={() => setShowAccount(false)} aria-label="닫기">×</button><GoAccount member={member} onChange={accountChanged} /></div></div>}
    {showCamera && dog && <div className="go-overlay" role="dialog" aria-modal="true" aria-label="현장 사진 촬영"><div className="go-dialog go-camera-dialog"><button className="go-close" onClick={() => setShowCamera(false)} aria-label="닫기">×</button><GoCamera dog={dog} onDone={() => { setShowCamera(false); setTab('mine'); load(0); }} /></div></div>}
  </main>;
}
