'use client';
import { useState } from 'react';
import { cardDate, rejectionText } from '../lib/goShared.js';
export default function GoCard({ card, member, onLogin, onDelete, compact = false }) {
  const [liked, setLiked] = useState(card.liked);
  const [count, setCount] = useState(card.likeCount);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [message, setMessage] = useState('');
  async function action(path, method = 'POST', body) {
    if (!member) { onLogin(); return null; }
    setBusy(true); setMessage('');
    try { const r = await fetch(`/api/go/cards/${card.id}${path}`, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }); const data = await r.json(); if (!r.ok) throw new Error(data.error); return data; }
    catch (e) { setMessage(e.message || '잠시 후 다시 시도해주세요.'); return null; } finally { setBusy(false); }
  }
  return <article className="go-card-entry"><div className="go-card"><div className="go-card-top">MEONG MEONG GO</div><div className="go-card-art"><img src={card.imageUrl} alt={card.dogName} loading="lazy" /></div><div className="go-card-body"><strong>{card.dogName}</strong><div className="go-card-information"><time dateTime={card.capturedAt}>{cardDate(card.capturedAt)}</time><span>{card.nickname}</span></div></div></div>{!compact && <div className="go-card-outside">{card.title && <h3>{card.title}</h3>}{card.description && <p className="go-record-text">{card.description}</p>}{card.status !== 'approved' && <p className="go-status">{card.status === 'pending' ? '공개 승인 대기' : card.status === 'rejected' ? `반려 · ${rejectionText(card)}` : '비공개 처리'}</p>}<div className="go-post-actions">{card.status === 'approved' && <button aria-pressed={liked} disabled={busy} onClick={async () => { const data = await action('/like'); if (data) { setLiked(data.liked); setCount(data.likeCount); } }}>{liked ? '♥' : '♡'} {count}</button>}{member?.id === card.ownerId ? <button disabled={busy} onClick={async () => { if (confirm('이 카드를 삭제할까요? 삭제 후에는 복구할 수 없어요.')) { if (await action('', 'DELETE')) onDelete?.(card.id); } }}>삭제</button> : card.status === 'approved' && <button onClick={() => member ? setReportOpen(!reportOpen) : onLogin()}>신고</button>}</div>{reportOpen && <div className="go-report-choices"><span>신고 이유</span>{[['privacy','얼굴·개인정보'],['wrong_dog','다른 멍멍이'],['inappropriate','부적절한 사진']].map(([reason,label]) => <button key={reason} disabled={busy} onClick={async () => { if (await action('/report', 'POST', { reason })) { setReportOpen(false); setMessage('신고가 접수됐어요.'); } }}>{label}</button>)}</div>}{message && <p className="go-note" role="status">{message}</p>}</div>}</article>;
}
