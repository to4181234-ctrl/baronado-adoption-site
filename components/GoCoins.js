'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { subscribeGoCoinNotices } from '../lib/goCoinNotices.js';

export const GO_STAGE1_UI_ENABLED = process.env.NEXT_PUBLIC_MEONGGO_STAGE1_COINS_ENABLED === '1';
const CoinsContext = createContext(null);
const EMPTY = { balance: 0, daily: { careRewards: 0, careQuestDone: false, visitQuestDone: false } };
const TYPES = {
  care: '강아지 돌보기',
  quest_care: '일일 퀘스트 · 첫 돌보기',
  quest_visit: '일일 퀘스트 · 방문 인증',
  visit_reversal: '방문 인증 승인 취소',
  store_purchase: '멍카드 상점 구매'
};
const FILTERS = [['all', '전체'], ['earn', '획득'], ['spend', '사용']];
const dateLabel = value => new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit'
}).format(new Date(value));

export function useGoCoins() {
  return useContext(CoinsContext);
}

export function GoCoinProvider({ member, children }) {
  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const requestRef = useRef(0);
  const refresh = useCallback(async () => {
    if (!GO_STAGE1_UI_ENABLED || !member?.id) return;
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const response = await fetch('/api/go/coins', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || '멍코인 정보를 가져오지 못했어요.');
      if (requestId === requestRef.current) {
        setState(data);
        setError('');
      }
    } catch (e) {
      if (requestId === requestRef.current) setError(e.message);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [member?.id]);

  useEffect(() => {
    if (!GO_STAGE1_UI_ENABLED) return;
    if (!member?.id) {
      ++requestRef.current;
      setState(EMPTY);
      setHistoryOpen(false);
      setError('');
      return;
    }
    refresh();
    const changed = () => refresh();
    const focus = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('go-coins-changed', changed);
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    // KST has a fixed UTC+9 offset and no daylight saving time.
    function timeUntilKoreaMidnight() {
      const shifted = Date.now() + 9 * 3600000;
      return 86400000 - shifted % 86400000 + 200;
    }
    const timeout = window.setTimeout(() => refresh(), timeUntilKoreaMidnight());
    return () => {
      ++requestRef.current;
      window.clearTimeout(timeout);
      window.removeEventListener('go-coins-changed', changed);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
    };
  }, [member?.id, refresh]);

  useEffect(() => subscribeGoCoinNotices(setNotice), []);
  return <CoinsContext.Provider value={{
    enabled: GO_STAGE1_UI_ENABLED, ...state, loading, error, refresh,
    openHistory: () => setHistoryOpen(true)
  }}>
    {children}
    {GO_STAGE1_UI_ENABLED && member?.id && historyOpen &&
      <GoCoinHistory onClose={() => setHistoryOpen(false)} />}
    {GO_STAGE1_UI_ENABLED && notice && <div className="go-coin-notice" role="status" aria-live="polite">
      {notice.amount > 0 ? '+' : '−'}{Math.abs(notice.amount)}C
    </div>}
  </CoinsContext.Provider>;
}

function GoCoinHistory({ onClose }) {
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const loadingRef = useRef(false);
  const sequence = useRef(0);
  const sentinel = useRef(null);
  const load = useCallback(async (offset, clear = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const current = ++sequence.current;
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ history: '1', filter, offset: String(offset) });
      const response = await fetch('/api/go/coins?' + query.toString(), { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || '거래 내역을 불러오지 못했어요.');
      if (current !== sequence.current) return;
      const history = data.history || { records: [], hasMore: false, nextOffset: 0 };
      setItems(previous => clear ? history.records : previous.concat(history.records));
      setNextOffset(history.nextOffset);
      setHasMore(history.hasMore);
    } catch (e) {
      if (current === sequence.current) setError(e.message);
    } finally {
      if (current === sequence.current) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [filter]);

  useEffect(() => {
    sequence.current++;
    loadingRef.current = false;
    setItems([]);
    setExpanded(null);
    setHasMore(false);
    setNextOffset(0);
    load(0, true);
  }, [filter, load]);

  useEffect(() => {
    if (!hasMore || loading || error || !sentinel.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) load(nextOffset);
    }, { rootMargin: '100px' });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasMore, loading, error, nextOffset, load]);

  useEffect(() => {
    function escape(event) { if (event.key === 'Escape') onClose(); }
    document.addEventListener('keydown', escape);
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', escape);
      document.body.style.overflow = old;
    };
  }, [onClose]);

  return <div className="go-coin-backdrop" role="presentation" onClick={onClose}>
    <section className="go-coin-sheet" role="dialog" aria-modal="true"
      aria-label="멍코인 이용 내역" onClick={event => event.stopPropagation()}>
      <header className="go-coin-sheet-header">
        <h2>멍코인 이용 내역</h2>
        <button type="button" onClick={onClose} aria-label="이용 내역 닫기">×</button>
      </header>
      <p className="go-coin-sheet-caption">최근 30일 동안의 멍코인 내역이에요.</p>
      <nav className="go-coin-filters" aria-label="멍코인 내역 필터">
        {FILTERS.map(([value, label]) =>
          <button key={value} type="button" aria-pressed={filter === value}
            onClick={() => setFilter(value)}>{label}</button>)}
      </nav>
      <div className="go-coin-history-list">
        {items.map(item => <article key={item.id} className="go-coin-transaction">
          <button type="button" aria-expanded={expanded === item.id}
            onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
            <span><strong>{TYPES[item.event_type] || '멍코인 이용'}</strong>
              <small>{dateLabel(item.created_at)}</small></span>
            <b className={item.amount > 0 ? 'is-positive' : ''}>
              {item.amount > 0 ? '+' : ''}{item.amount}C
            </b>
          </button>
          {expanded === item.id && <p className="go-coin-transaction-extra">
            내역 구분: {item.amount > 0 ? '획득' : '사용'} · 기준일 {item.local_day}
          </p>}
        </article>)}
        {items.length === 0 && !loading && !error &&
          <p className="go-coin-empty">표시할 멍코인 내역이 없어요.</p>}
        {loading && <p className="go-coin-empty" role="status">불러오는 중…</p>}
        {error && <p className="go-coin-error" role="alert">{error}
          <button type="button" onClick={() => load(nextOffset, items.length === 0)}>다시 시도</button>
        </p>}
        <div ref={sentinel} aria-hidden="true" />
        {hasMore && !loading && <button className="go-coin-more" type="button"
          onClick={() => load(nextOffset)}>내역 더 보기</button>}
      </div>
    </section>
  </div>;
}
