'use client';

import { useState } from 'react';
import { recordShareClick, recordInquiryClick } from '../lib/siteAnalytics';

function ActionIcon({ kind }) {
  if (kind === 'share') return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3m-5 5 5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>;
  if (kind === 'phone') return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.7 19.7 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.12 1 .35 2 .68 2.9a2 2 0 0 1-.45 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.45c.95.33 1.92.56 2.9.68a2 2 0 0 1 1.7 1.97Z" /></svg>;
  return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20V4m-7 7 7-7 7 7" /></svg>;
}

export default function DogActions({ dog = null, allowInquiry = false, hidden = false }) {
  const [contactOpen, setContactOpen] = useState(false);
  const [message, setMessage] = useState('');
  const canInquire = dog ? dog.category === 'adoption' && !dog.adopted : allowInquiry;

  const share = async () => {
    recordShareClick(dog ? 'dog' : allowInquiry ? 'home' : 'residents', dog?.id);
    const data = { url: window.location.href };
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
        setMessage('주소창에서 링크를 복사해주세요.');
      }
    }
  };

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  const openInquiry = () => {
    recordInquiryClick(dog ? 'dog' : 'home', dog?.id);
    setContactOpen(true);
  };

  return <>
    {!hidden && <div className="floating-action-bar" role="group" aria-label="페이지 바로가기">
      <button type="button" className="floating-action-btn" onClick={share} title="현재 페이지 공유" aria-label="현재 페이지 공유">
        <ActionIcon kind="share" /><span>공유</span>
      </button>
      {canInquire && <button type="button" className="floating-action-btn inquiry" onClick={openInquiry} title="입양 문의 전화" aria-label="입양 문의 전화">
        <ActionIcon kind="phone" /><span>문의</span>
      </button>}
      <button type="button" className="floating-action-btn" onClick={scrollToTop} title="맨 위로 이동" aria-label="맨 위로 이동">
        <ActionIcon kind="up" /><span>맨 위</span>
      </button>
    </div>}
    {message && !hidden && <div className="floating-action-message" role="status" onClick={() => setMessage('')}>{message}</div>}
    {contactOpen && <div className="image-modal contact-backdrop" onClick={() => setContactOpen(false)}>
      <div className="contact-dialog" role="dialog" aria-modal="true" aria-label={dog ? `${dog.name} 입양 문의 전화번호` : '입양 문의 전화번호'} onClick={event => event.stopPropagation()}>
        <div className="contact-heading"><h2>{dog ? `${dog.name} 입양 문의` : '입양 문의'}</h2><button type="button" onClick={() => setContactOpen(false)} aria-label="문의 창 닫기">×</button></div>
        <p>전화할 곳을 선택해주세요.</p>
        <a href="tel:0312131080"><span>매장</span><strong>031-213-1080</strong><span aria-hidden="true">전화 ↗</span></a>
        <a href="tel:01047271081"><span>대표</span><strong>010-4727-1081</strong><span aria-hidden="true">전화 ↗</span></a>
      </div>
    </div>}
  </>;
}
