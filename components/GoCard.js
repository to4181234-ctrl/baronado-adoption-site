'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { cardDate, rejectionText } from '../lib/goShared.js';
import { EMPTY_RATINGS, RATING_TRAITS } from '../lib/goRatings.js';
import GoRatingsEditor, { RatingStar } from './GoRatingsEditor.js';

export default function GoCard({ card, member, onLogin, onDelete, compact = false }) {
  const [liked, setLiked] = useState(Boolean(card.liked));
  const [count, setCount] = useState(card.likeCount || 0);
  const [ratings, setRatings] = useState(card.ratings || EMPTY_RATINGS);
  const [draft, setDraft] = useState(ratings);
  const [editRatings, setEditRatings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [message, setMessage] = useState('');
  const inFlight = useRef(false);
  const isOwner = member?.id === card.ownerId;
  const hasRatings = RATING_TRAITS.some(trait => ratings[trait.key] != null);

  async function action(path, method = 'POST', body) {
    if (!member) { onLogin(); return null; }
    if (inFlight.current) return null;
    inFlight.current = true;
    setBusy(true); setBusyAction(path); setMessage('');
    try {
      const response = await fetch(`/api/go/cards/${card.id}${path}`, {
        method, headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    } catch (error) {
      setMessage(error.name === 'TimeoutError' ? '응답이 늦어지고 있어요. 다시 눌러주세요.' : error.message || '잠시 후 다시 시도해주세요.');
      return null;
    } finally {
      inFlight.current = false; setBusy(false); setBusyAction('');
    }
  }

  return <article className="go-card-entry">
    <div className="go-card">
      <div className="go-card-top">MEONG MEONG GO!</div>
      <div className="go-card-art"><img src={card.imageUrl} alt={card.dogName} loading="lazy" /></div>
      <div className="go-card-body">
        <strong>{card.dogName}</strong>
        {card.description && <p className="go-card-description">{card.description}</p>}
        {hasRatings && <div className="go-card-ratings" aria-label="작성자가 기록한 별점">
          {RATING_TRAITS.map(trait => <div key={trait.key}><span>{trait.label}</span>{ratings[trait.key] == null ? <small>미기록</small> : <span className="go-rating-stars" role="img" aria-label={`${trait.label} 5점 만점에 ${ratings[trait.key]}점`}>{[1,2,3,4,5].map(score => <RatingStar key={score} filled={score <= ratings[trait.key]} />)}</span>}</div>)}
        </div>}
        <div className="go-card-information"><time dateTime={card.capturedAt}>{cardDate(card.capturedAt)}</time><span>{card.nickname}</span></div>
      </div>
    </div>
    {!compact && <div className="go-card-outside">
      {card.title && <h3><Link href={`/go/posts/${card.id}`}>{card.title}</Link></h3>}
      {card.status !== 'approved' && <p className="go-status">{card.status === 'pending' ? '공개 승인 대기' : card.status === 'rejected' ? `반려 · ${rejectionText(card)}` : '비공개 처리'}</p>}
      <div className="go-post-actions">
        {card.status === 'approved' && <button type="button" className="go-like-button" aria-label={`${card.dogName} 카드 좋아요 ${count}개`} aria-pressed={liked} aria-busy={busy && busyAction === '/like'} disabled={busy} onClick={async () => {
          const data = await action('/like', 'POST', { liked: !liked });
          if (data) { setLiked(data.liked); setCount(data.likeCount); }
        }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" /></svg><span>좋아요 {count}</span></button>}
        <div className="go-secondary-actions">
          {isOwner ? <><button type="button" disabled={busy} onClick={() => { setDraft({ ...ratings }); setEditRatings(true); setMessage(''); }}>별점 수정</button><button type="button" disabled={busy} onClick={async () => {
            if (confirm('이 카드를 삭제할까요? 삭제 후에는 복구할 수 없어요.') && await action('', 'DELETE')) onDelete?.(card.id);
          }}>삭제</button></> : card.status === 'approved' && <button type="button" onClick={() => member ? setReportOpen(!reportOpen) : onLogin()}>신고</button>}
        </div>
      </div>
      {reportOpen && <div className="go-report-choices"><span>신고 이유</span>{[['privacy','얼굴·개인정보'],['wrong_dog','다른 멍멍이'],['inappropriate','부적절한 사진']].map(([reason,label]) => <button key={reason} disabled={busy} onClick={async () => { if (await action('/report', 'POST', { reason })) { setReportOpen(false); setMessage('신고가 접수됐어요.'); } }}>{label}</button>)}</div>}
      {message && <p className="go-note" role="status">{message}</p>}
    </div>}
    {editRatings && <div className="go-overlay" role="dialog" aria-modal="true" aria-label="내 카드 별점 수정"><div className="go-dialog"><button type="button" className="go-close" disabled={busy} onClick={() => setEditRatings(false)} aria-label="닫기">×</button><h2>별점 수정</h2><GoRatingsEditor value={draft} onChange={setDraft} disabled={busy} />{message && <p className="go-error" role="alert">{message}</p>}<button type="button" className="go-primary go-rating-save" disabled={busy} onClick={async () => { const data = await action('', 'PATCH', { ratings: draft }); if (data) { setRatings(data.ratings); setEditRatings(false); } }}>{busy ? '저장 중…' : '별점 저장'}</button></div></div>}
  </article>;
}
