'use client';

import { useState } from 'react';

export default function DogActions({ dog, hidden = false }) {
  const [contactOpen, setContactOpen] = useState(false);
  const [message, setMessage] = useState('');
  const canInquire = dog.category === 'adoption' && !dog.adopted;

  const share = async () => {
    const data = { title: `${dog.name} · 바로나도`, text: `${dog.name}의 소개를 함께 봐주세요.`, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(data.url);
      setMessage('링크가 복사됐어요');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(data.url);
        setMessage('링크가 복사됐어요');
      } catch {
        setMessage('링크를 복사하지 못했어요. 주소창에서 복사해주세요.');
      }
    }
  };

  return <>
    {!hidden && <div className={`detail-action-bar ${canInquire ? '' : 'share-only'}`}>
      <button type="button" className="detail-share" onClick={share} aria-label={`${dog.name} 소개 링크 공유`}>공유</button>
      {canInquire && <button type="button" className="detail-inquire" onClick={() => setContactOpen(true)}>입양 문의하기</button>}
    </div>}
    {message && !hidden && <div className="share-message" role="status" onClick={() => setMessage('')}>{message}</div>}
    {contactOpen && <div className="image-modal contact-backdrop" onClick={() => setContactOpen(false)}>
      <div className="contact-dialog" role="dialog" aria-modal="true" aria-label={`${dog.name} 입양 문의 전화번호`} onClick={event => event.stopPropagation()}>
        <div className="contact-heading"><h2>{dog.name} 입양 문의</h2><button type="button" onClick={() => setContactOpen(false)} aria-label="문의 창 닫기">×</button></div>
        <p>전화할 곳을 선택해주세요.</p>
        <a href="tel:0312131080"><span>매장</span><strong>031-213-1080</strong><span aria-hidden="true">전화 ↗</span></a>
        <a href="tel:01047271081"><span>대표</span><strong>010-4727-1081</strong><span aria-hidden="true">전화 ↗</span></a>
      </div>
    </div>}
  </>;
}
