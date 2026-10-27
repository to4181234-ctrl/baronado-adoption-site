'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { fetchDogs } from '../lib/dogs.js';
import GoShell, { useGoSession } from './GoShell.js';
import GoCard from './GoCard.js';
import GoCamera from './GoCamera.js';

function Album({ dogId }) {
  const { member, ready, openAccount } = useGoSession();
  const [dogs, setDogs] = useState([]);
  const [dogsReady, setDogsReady] = useState(false);
  const [adopted, setAdopted] = useState(false);
  const [cards, setCards] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const dog = dogs.find(item => item.id === dogId);
  useEffect(() => { fetchDogs('adoption').then(setDogs).catch(() => setError('멍멍 도감을 불러오지 못했어요.')).finally(() => setDogsReady(true)); }, []);
  const load = useCallback(async (nextPage = 0) => {
    if (!dogId || !member) { setCards([]); return; }
    setLoading(true); setError('');
    try {
      const r = await fetch(`/api/go/cards?mine=1&dog=${dogId}&page=${nextPage}`, { cache: 'no-store' });
      const data = await r.json(); if (!r.ok) throw new Error(data.error);
      setCards(previous => nextPage ? [...previous, ...data.cards] : data.cards); setPage(nextPage); setHasMore(data.hasMore);
    } catch (e) { setError(e.message || '카드를 불러오지 못했어요.'); } finally { setLoading(false); }
  }, [dogId, member]);
  useEffect(() => { load(0); }, [load]);
  const filtered = dogs.filter(item => item.adopted === adopted);
  if (!dogId) return <><div className="go-section-title"><h2>멍멍 도감</h2><span>{filtered.length}개의 도감</span></div><div className="go-filter-tabs" role="group" aria-label="입양 상태"><button aria-pressed={!adopted} onClick={() => setAdopted(false)}>입양 전</button><button aria-pressed={adopted} onClick={() => setAdopted(true)}>입양 후</button></div>{error && <p className="go-error">{error}</p>}{!dogsReady ? <p className="go-note">도감을 불러오는 중이에요.</p> : <div className="go-dog-grid">{filtered.map(item => <Link className="go-dog-tile" href={`/go/${item.id}`} key={item.id}><div>{item.images?.[0] && <img src={item.images[0]} alt={item.name} loading="lazy" />}</div><strong>{item.name}</strong><small>도감 열기</small></Link>)}</div>}</>;
  return <><Link className="go-home" href="/go">← 멍멍 도감 목록</Link>{dog ? <><div className="go-dog-title"><div className="go-dog-avatar">{dog.images?.[0] && <img src={dog.images[0]} alt="" />}</div><div><h2>{dog.name} 도감</h2><p>{dog.adopted ? '입양 후 · 지난 카드는 그대로 남아 있어요.' : '현장에서 만난 순간을 내 카드로 기록해요.'}</p></div></div><div className="go-album-toolbar"><span>내 카드</span>{!dog.adopted && <button className="go-primary" onClick={() => member ? setShowCamera(true) : openAccount()}>카메라 촬영</button>}</div></> : <p className="go-note">{dogsReady ? '도감을 찾지 못했어요.' : '도감을 불러오는 중이에요.'}</p>}{error && <p className="go-error">{error}</p>}{ready && !member && <div className="go-empty">상단에서 회원가입/로그인 후 내 카드를 모아보세요.</div>}{member && !loading && !cards.length && <p className="go-empty">아직 기록한 카드가 없어요.</p>}<div className="go-card-grid">{cards.map(card => <GoCard key={card.id} card={card} member={member} onLogin={openAccount} onDelete={id => setCards(previous => previous.filter(item => item.id !== id))} />)}</div>{loading && <p className="go-note">카드를 불러오는 중이에요.</p>}{hasMore && !loading && <button className="go-more" onClick={() => load(page + 1)}>더 보기</button>}{showCamera && dog && <div className="go-overlay" role="dialog" aria-modal="true" aria-label="멍멍이 촬영"><div className="go-dialog go-camera-dialog"><button className="go-close" onClick={() => setShowCamera(false)} aria-label="닫기">×</button><GoCamera dog={dog} onDone={() => { setShowCamera(false); load(0); }} /></div></div>}</>;
}
export default function GoPage({ dogId = null }) { return <GoShell><Album dogId={dogId} /></GoShell>; }
