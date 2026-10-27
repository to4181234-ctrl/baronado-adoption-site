'use client';

import { useState } from 'react';

const dateText = value => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value));

export default function GoCard({ card, member, onLogin, onDelete }) {
  const [flipped, setFlipped] = useState(false);
  const [liked, setLiked] = useState(card.liked);
  const [count, setCount] = useState(card.likeCount);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const toggleLike = async () => {
    if (!member) return onLogin();
    if (busy || card.status !== 'approved') return;
    setBusy(true);
    try {
      const response = await fetch(`/api/go/cards/${card.id}/like`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '좋아요를 저장하지 못했어요.');
      setLiked(data.liked);
      setCount(data.likeCount);
    } catch (error) { alert(error.message); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm('이 카드를 도감에서 삭제할까요? 삭제하면 다시 복구할 수 없어요.')) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/go/cards/${card.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).error || '삭제하지 못했어요.');
      onDelete(card.id);
    } catch (error) { alert(error.message); }
    finally { setBusy(false); }
  };
  const report = async reason => {
    if (!member) return onLogin();
    const response = await fetch(`/api/go/cards/${card.id}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
    const result = await response.json();
    setReportOpen(false);
    alert(response.ok ? '신고가 접수됐어요.' : result.error || '잠시 후 다시 시도해주세요.');
  };

  return <article className="go-card">
    <div className="go-card-top"><span>MEONG MEONG GO</span><span>{card.photoStyle === 'cutout' ? '✦ 누끼' : '📷 원본'}</span></div>
    <button className={`go-card-art ${card.photoStyle === 'cutout' ? 'go-card-cutout' : ''}`} onClick={() => setFlipped(!flipped)} aria-label={`${card.dogName} 카드 ${flipped ? '사진' : '기록'} 보기`}>
      {flipped ? <div className="go-card-back"><span>만난 날 · {dateText(card.capturedAt)}</span><p>{card.description || '오늘도 반가웠어!'}</p><small>다시 눌러 사진 보기</small></div>
        : <><img src={card.imageUrl} alt={`${card.dogName}의 방문 기록`} loading="lazy" /><span className="go-card-hint">눌러서 기록 보기 ↗</span></>}
    </button>
    <div className="go-card-body"><div className="go-card-title"><strong>{card.dogName}</strong><span>{card.adopted ? '가족을 만났어요' : '가족을 기다려요'}</span></div>
      <p>📍 바로나도에서 만난 날 · {dateText(card.capturedAt)}</p>
      <div className="go-card-footer"><span>기록한 사람 <b>{card.nickname}</b></span>
        {card.status === 'approved' ? <button type="button" onClick={toggleLike} disabled={busy} aria-label={`${card.dogName} 카드 좋아요 ${count}개`} aria-pressed={liked} className={liked ? 'go-like liked' : 'go-like'}>{liked ? '♥' : '♡'} {count}</button> : <span className="go-pending">{card.status === 'pending' ? '공개 검토 중' : card.status === 'rejected' ? '비공개 처리' : '숨김'}</span>}</div>
      {member?.id === card.ownerId && <button className="go-delete" onClick={remove} disabled={busy}>내 카드 삭제</button>}
      {card.status === 'approved' && member?.id !== card.ownerId && <><button className="go-delete" onClick={() => member ? setReportOpen(!reportOpen) : onLogin()}>카드 신고</button>{reportOpen && <div className="go-report-choices"><span>신고 이유</span><button onClick={() => report('privacy')}>얼굴·개인정보</button><button onClick={() => report('wrong_dog')}>다른 강아지</button><button onClick={() => report('inappropriate')}>부적절한 사진</button></div>}</>}
    </div>
  </article>;
}
