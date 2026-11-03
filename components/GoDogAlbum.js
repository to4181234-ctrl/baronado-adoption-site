'use client';

import Link from 'next/link';
import GoPixelChoice from './GoPixelChoice.js';
import { useCallback, useEffect, useState } from 'react';
import { fetchDogs } from '../lib/dogs.js';
import { figmaSprite, gameElement } from '../lib/goV3Game.js';
import { useGoSession } from './GoShell.js';
import GoCard from './GoCard.js';
import GoCamera from './GoCamera.js';
import { ALBUM_PAGE_SIZE, ALBUM_SELECTION_LIMIT, toggleAlbumSelection, lastAlbumPage, albumRankPercent } from '../lib/goAlbumSelection.js';

const EMPTY_COLLECTION = { counts: {}, covers: {}, standing: null };
const ALBUM_SHADOWS = {
  깡지: '/figma-v3/album-shadow-kangji.svg',
  버디: '/figma-v3/album-shadow-buddy.svg',
  뽀실: '/figma-v3/album-shadow-pposil.svg',
  구름: '/figma-v3/album-shadow-gureum.svg',
  오레오: '/figma-v3/album-shadow-oreo.svg',
};
const PER_PAGE = ALBUM_PAGE_SIZE;
const MAX_SELECTION = ALBUM_SELECTION_LIMIT;

/** The six Figma dog-album states live on this single route, not six mockup pages. */
export default function GoDogAlbum({ dogId }) {
  const { member, ready, openAccount } = useGoSession();
  const [dog, setDog] = useState(null);
  const [loadingDog, setLoadingDog] = useState(true);
  const [collection, setCollection] = useState(EMPTY_COLLECTION);
  const [cards, setCards] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [order, setOrder] = useState('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [collectConfirm, setCollectConfirm] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);
  const [cardResultKey, setCardResultKey] = useState('');
  const [stateRestored, setStateRestored] = useState(false);

  useEffect(() => {
    let active = true;
    setDog(null);
    setLoadingDog(true);
    fetchDogs('adoption').then(dogs => {
      if (active) setDog(dogs.find(item => item.id === dogId) || null);
    }).catch(() => { if (active) setError('강아지 정보를 불러오지 못했어요.'); })
      .finally(() => { if (active) setLoadingDog(false); });
    return () => { active = false; };
  }, [dogId]);

  const refresh = useCallback(() => setRefreshCount(count => count + 1), []);
  useEffect(() => {
    let active = true;
    if (!ready || !member) { setCollection(EMPTY_COLLECTION); return () => { active = false; }; }
    fetch('/api/go/collection?dog=' + encodeURIComponent(dogId), { cache: 'no-store' })
      .then(async r => { const result = await r.json(); if (!r.ok) throw new Error(result.error); return result; })
      .then(result => { if (active) setCollection(result); })
      .catch(e => { if (active) setError(e.message || '도감 현황을 불러오지 못했어요.'); });
    return () => { active = false; };
  }, [dogId, ready, member?.id, refreshCount]);

  useEffect(() => {
    let active = true;
    if (!ready || !member) { setCards([]); setTotal(0); setCardResultKey(''); return () => { active = false; }; }
    const params = new URLSearchParams({ mine: '1', dog: dogId, page: String(page), limit: String(PER_PAGE), order });
    fetch('/api/go/cards?' + params, { cache: 'no-store' })
      .then(async r => { const result = await r.json(); if (!r.ok) throw new Error(result.error); return result; })
      .then(result => { if (active) { setCards(result.cards || []); setTotal(result.total || 0); setCardResultKey([dogId, member.id, page, order].join(':')); } })
      .catch(e => { if (active) setError(e.message || '수집 카드를 불러오지 못했어요.'); });
    return () => { active = false; };
  }, [dogId, ready, member?.id, page, order, refreshCount]);

  useEffect(() => {
    setSelectionMode(false); setSelectedIds([]); setSortOpen(false);
    setStateRestored(false);
    // Preserve the current dog's sort and page when navigating into a card and back.
    try {
      const saved = JSON.parse(sessionStorage.getItem('baronado-album-' + dogId) || '{}');
      setOrder(saved.order === 'oldest' ? 'oldest' : 'newest');
      setPage(Number.isInteger(saved.page) && saved.page >= 0 ? Math.min(saved.page, 1000) : 0);
    } catch { setOrder('newest'); setPage(0); }
    setStateRestored(true);
  }, [dogId, member?.id]);

  useEffect(() => {
    if (!stateRestored) return;
    try { sessionStorage.setItem('baronado-album-' + dogId, JSON.stringify({ page, order })); } catch {}
  }, [dogId, stateRestored, page, order]);

  useEffect(() => {
    const lastPage = lastAlbumPage(total, PER_PAGE);
    // A previous page's cached total must never overwrite a restored page.
    if (ready && member && cardResultKey === [dogId, member.id, page, order].join(':') && page > lastPage) setPage(lastPage);
  }, [page, total, ready, member?.id, dogId, order, cardResultKey]);

  useEffect(() => {
    if (!sortOpen && !deleteOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [sortOpen, deleteOpen]);

  useEffect(() => {
    if (!sortOpen && !deleteOpen) return;
    const handle = event => { if (event.key === 'Escape' && !deleting) { setSortOpen(false); setDeleteOpen(false); } };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [sortOpen, deleteOpen, deleting]);

  function setSort(value) {
    setOrder(value);
    setPage(0);
    setSelectedIds([]); // Explicit Figma rule: sorting invalidates a multi-page selection.
    setSortOpen(false);
  }

  function toggleSelected(id) {
    setSelectedIds(previous => toggleAlbumSelection(previous, id, MAX_SELECTION));
  }

  function startSelection(id) {
    if (!member) { openAccount(); return; }
    setSelectionMode(true);
    setSelectedIds(previous => previous.includes(id) ? previous : [...previous, id]);
  }

  function cancelSelection() {
    setDeleteOpen(false); setSelectionMode(false); setSelectedIds([]);
  }

  async function deleteSelected() {
    if (!member || deleting || !selectedIds.length) return;
    setDeleting(true); setError('');
    try {
      const response = await fetch('/api/go/cards', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const result = await response.json();
      if (!response.ok || result.partial || result.deletedIds?.length !== selectedIds.length) {
        throw new Error(result.error || '일부 카드 삭제가 완료되지 않았어요. 목록을 다시 확인해주세요.');
      }
      setNotice(`선택한 카드 ${result.deletedIds.length}장을 삭제했어요.`);
      setPage(current => Math.min(current, lastAlbumPage(Math.max(0, total - result.deletedIds.length), PER_PAGE)));
      cancelSelection(); refresh();
    } catch (e) {
      // On failure, keep selected IDs and the original cards visible for safe retry.
      setError(e.message || '카드를 삭제하지 못했어요.');
    } finally { setDeleting(false); }
  }

  if (loadingDog || !ready) return <p className="v3-status" role="status">도감을 불러오는 중…</p>;
  if (!dog) return <p className="v3-error">도감을 찾지 못했어요.</p>;

  const ownedCount = total;
  const hasCards = Boolean(member && ownedCount > 0);
  const dogImage = hasCards ? figmaSprite(dog.name, 'front') : (ALBUM_SHADOWS[dog.name] || figmaSprite(dog.name, 'shadow'));
  const ranking = hasCards ? albumRankPercent(collection.standing?.rank, collection.standing?.participants) : null;
  const maxPage = Math.max(1, Math.ceil(total / PER_PAGE));
  const deleteDogName = dog.name;

  return <div className="v5-dog-album" data-figma-frame={hasCards ? '173:2448' : '173:2315'}>
    <section className={'v5-album-yellow ' + (hasCards ? 'v5-has-cards' : 'v5-zero-cards')}>
      <h1>{dog.name} 도감</h1>
      {ranking !== null && <div className="v5-album-rank">
        <p>{member?.nickname || '멍기록가'}님은 {dog.name} 멍기록가 중 상위 {ranking}% 입니다</p>
        <small>보유 카드 수 기준 · 같은 수는 공동 순위</small>
      </div>}
      <div className="v5-album-dog-picture">
        {hasCards ? <Link href={'/go/interact/' + dog.id} aria-label={`${dog.name} 만나러가기`}>
          <img src={dogImage} alt={`${dog.name} 픽셀 캐릭터`}/><span>{dog.name} 만나러가기</span>
        </Link> : <div>
          <img src={dogImage} alt={`${dog.name} 미획득 실루엣`}/>
          <Link href={'/dogs/' + dog.id}>힌트 보러가기 ›</Link>
        </div>}
      </div>
      <div className="v5-album-summary">
        <strong>{dog.name}</strong>
        <span className="v5-count-caption">수집 카드</span>
        <span className="v5-count-value">{ownedCount}{hasCards ? '장' : '개'}</span>
        <span className="v5-element-caption">속성</span>
        <span className="v5-element-value">{hasCards ? <>✧ {gameElement(dog.name)}</> : '미공개'}</span>
      </div>
      {!dog.adopted && <button className="v5-album-collect" type="button" onClick={() => member ? setCollectConfirm(true) : openAccount()}>멍카드 수집하러가기 <span aria-hidden="true">›</span></button>}
    </section>

    <section className={'v5-album-list ' + (!hasCards ? 'v5-album-empty' : '')}>
      <div className="v5-album-toolbar">
        <h2>수집한 카드 ({total}장)</h2>
        {member && total > 0 && <div className="v5-manage-actions">
          {!selectionMode ? <button type="button" onClick={() => setSelectionMode(true)}>카드 선택</button> : <>
            <button type="button" onClick={cancelSelection}>취소</button>
            <button type="button" className="v5-manage-delete" disabled={!selectedIds.length || deleting} onClick={() => setDeleteOpen(true)}>삭제 {selectedIds.length}</button>
          </>}
        </div>}
        <div className="v5-sort-control">
          <span>등록 순서ㅣ</span><button type="button" aria-expanded={sortOpen} aria-haspopup="dialog" onClick={() => setSortOpen(true)}>{order === 'newest' ? '최신순' : '오래된순'}<span aria-hidden="true">⌄</span></button>
        </div>
      </div>
      {!member ? <div className="v5-empty-message"><p>로그인하면 수집한 카드를 볼 수 있어요.</p><button onClick={openAccount}>로그인하기</button></div>
        : total === 0 ? <div className="v5-empty-message"><p>아직 수집한 카드가 없어요.<br/>힌트에서 {dog.name}의 이야기를 만나보세요.</p><img src="/figma-v3/album-empty-collar.png" alt="픽셀 목줄"/></div>
        : <>
          <div className="v5-card-grid">
            {cards.map(card => <GoCard key={card.id} card={card} member={member} onLogin={openAccount}
              compact linkToPost={!selectionMode} selectMode={selectionMode} selected={selectedIds.includes(card.id)}
              onSelect={toggleSelected} onLongPress={!selectionMode ? () => startSelection(card.id) : undefined}
              onDelete={refresh} />)}
          </div>
          <div className="v5-card-pager" aria-label="수집 카드 페이지">
            <button type="button" disabled={page === 0} aria-label="이전 페이지" onClick={() => setPage(p => p - 1)}>‹</button>
            <span>{page + 1}</span><span className="v5-pager-divider">/</span><span>{maxPage}</span>
            <button type="button" disabled={page + 1 >= maxPage} aria-label="다음 페이지" onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </>}
    </section>
    <Link className="v5-album-back-link" href="/go">← 내 도감으로 돌아가기</Link>
    {notice && <p className="v3-message" role="status">{notice}</p>}
    {error && <p className="v3-error" role="alert">{error}</p>}

    {sortOpen && <div className="v5-modal-backdrop" role="presentation" onClick={() => setSortOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="수집 카드 정렬" className="v5-sort-dialog" onClick={e => e.stopPropagation()}>
        <h3>등록 순서</h3>
        <button type="button" aria-pressed={order === 'newest'} onClick={() => setSort('newest')}><span>최신순</span>{order === 'newest' && <b aria-hidden="true">✓</b>}</button>
        <button type="button" aria-pressed={order === 'oldest'} onClick={() => setSort('oldest')}><span>오래된순</span>{order === 'oldest' && <b aria-hidden="true">✓</b>}</button>
      </div>
    </div>}

    {deleteOpen && <div className="v5-modal-backdrop" role="presentation" onClick={() => !deleting && setDeleteOpen(false)}>
      <section role="dialog" aria-modal="true" aria-label="선택 카드 삭제 확인" className="v5-delete-dialog" onClick={e => e.stopPropagation()}>
        <h2>{deleteDogName} 카드 {selectedIds.length}장을 삭제할까요?</h2>
        <p>내 도감 › {deleteDogName} · 선택한 카드 {selectedIds.length}장<br/>공개 게시물도 함께 삭제돼요.</p>
        <button type="button" className="v5-confirm-delete" disabled={deleting} onClick={deleteSelected}>{deleting ? '삭제 중…' : `선택한 ${selectedIds.length}장 삭제`}</button>
        <button type="button" className="v5-cancel-delete" disabled={deleting} onClick={() => setDeleteOpen(false)}>취소</button>
        <small>해당 강아지의 모든 카드를 삭제하면<br/>도감 획득 기록과 배틀 전적도 사라져요.</small>
      </section>
    </div>}

    {collectConfirm && <div className="v3-discovery-backdrop v3-discovery-figma" role="presentation" onClick={() => setCollectConfirm(false)}>
      <section className="v3-discovery-modal v3-collection-confirm" role="dialog" aria-modal="true" aria-label="멍카드 수집 준비" onClick={e => e.stopPropagation()}>
        <button className="v3-discovery-close" aria-label="닫기" onClick={() => setCollectConfirm(false)}>×</button>
        <h2><img className="v3-discovery-figma-title" src="/figma-v3/discovery-title.svg" alt="멍멍GO!"/></h2>
        <div className="v3-discovery-stage" aria-hidden="true"><img className="v3-discovery-reveal" src="/figma-v3/collar.png" alt=""/></div>
        <div className="v3-discovery-dialog">
          {['bg', 'outer', 'inner'].map(n => <img key={n} className={'v3-discovery-dialog-layer v3-discovery-dialog-' + n} src={'/figma-v3/discovery-dialog-' + n + '.svg'} alt=""/>)}
          <div className="v3-discovery-dialog-content">멍카드 수집 할 준비 되셨나요?
            <GoPixelChoice initial onClick={() => { setCollectConfirm(false); setCameraOpen(true); }}>네</GoPixelChoice>
            <GoPixelChoice onClick={() => setCollectConfirm(false)}>아직..</GoPixelChoice>
          </div>
        </div>
      </section>
    </div>}
    {cameraOpen && <div className="v3-camera-backdrop" role="presentation">
      <section className="v3-camera-panel" role="dialog" aria-modal="true" aria-label="멍멍이 카드 촬영">
        <button className="v3-camera-close" aria-label="카메라 닫기" onClick={() => setCameraOpen(false)}>×</button>
        <GoCamera dog={dog} nickname={member?.nickname} standing={collection.standing} firstCard={ownedCount === 0} onSaved={refresh} onDone={() => setCameraOpen(false)}/>
      </section>
    </div>}
  </div>;
}
