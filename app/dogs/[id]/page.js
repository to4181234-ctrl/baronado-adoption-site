'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CATEGORY_RESIDENT, fetchDog } from '../../../lib/dogs';
import { getAgeInfo, getShelterUrl } from '../../../lib/profile';
import { STORY_FIELDS, storyForDog } from '../../../lib/dog-story';
import SiteHeader from '../../../components/SiteHeader';

function PawIcon() {
  return <svg className="paw" viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M20.3 27.1c4.1 0 7.4 4.3 7.4 9.6s-3.3 9.6-7.4 9.6-7.4-4.3-7.4-9.6 3.3-9.6 7.4-9.6Zm23.4 0c4.1 0 7.4 4.3 7.4 9.6s-3.3 9.6-7.4 9.6-7.4-4.3-7.4-9.6 3.3-9.6 7.4-9.6ZM15.9 17.7c3 0 5.4 3.1 5.4 6.9s-2.4 6.9-5.4 6.9-5.4-3.1-5.4-6.9 2.4-6.9 5.4-6.9Zm32.2 0c3 0 5.4 3.1 5.4 6.9s-2.4 6.9-5.4 6.9-5.4-3.1-5.4-6.9 2.4-6.9 5.4-6.9ZM32 11.2c3.2 0 5.8 3.4 5.8 7.6s-2.6 7.6-5.8 7.6-5.8-3.4-5.8-7.6 2.6-7.6 5.8-7.6Zm0 29.1c7 0 14.1 5.8 14.1 11.5 0 4.1-3.6 5.3-7.8 4.3-2.1-.5-4.1-1.4-6.3-1.4s-4.2.9-6.3 1.4c-4.2 1-7.8-.2-7.8-4.3 0-5.7 7.1-11.5 14.1-11.5Z"/></svg>;
}

export default function DogDetailPage() {
  const params = useParams();
  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const startX = useRef(null);
  const modalStartX = useRef(null);

  useEffect(() => {
    if (!params?.id) return;
    fetchDog(params.id)
      .then(setDog)
      .catch(() => setError('게시글을 찾을 수 없어요.'))
      .finally(() => setLoading(false));
  }, [params?.id]);

  const images = dog?.images ?? [];
  const hasImages = images.length > 0;
  const backHref = dog?.category === CATEGORY_RESIDENT ? '/residents' : '/';
  const story = storyForDog(dog);

  const move = (direction) => {
    if (!hasImages) return;
    setIndex((prev) => (prev + direction + images.length) % images.length);
  };

  const openImage = () => {
    if (!hasImages) return;
    setModalOpen(true);
  };

  const onPointerDown = (event) => {
    startX.current = event.clientX;
  };

  const onPointerUp = (event) => {
    if (startX.current === null) return;
    const diff = event.clientX - startX.current;
    if (Math.abs(diff) > 35) move(diff < 0 ? 1 : -1);
    startX.current = null;
  };

  const onModalPointerDown = (event) => {
    modalStartX.current = event.clientX;
  };

  const onModalPointerUp = (event) => {
    if (modalStartX.current === null) return;
    const diff = event.clientX - modalStartX.current;
    if (Math.abs(diff) > 35) move(diff < 0 ? 1 : -1);
    modalStartX.current = null;
  };

  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="container detail-container">
        <Link className="back-link" href={backHref}>뒤로 가기</Link>

        {loading && <div className="empty-state compact">게시글을 불러오는 중이에요.</div>}
        {error && <div className="message error">{error}</div>}

        {dog && (
          <article className="detail-card">
            <div
              className="gallery"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              title={hasImages ? '사진 크게 보기' : undefined}
            >
              <button
                type="button"
                className="gallery-main"
                onClick={openImage}
                aria-label="사진 크게 보기"
                disabled={!hasImages}
              >
                {hasImages ? <img src={images[index]} alt={`${dog.name} 사진 ${index + 1}`} /> : <PawIcon />}
                {dog.adopted && <span className="adopted-badge detail">입양 완료</span>}
                {hasImages && <span className="zoom-hint">사진 크게 보기</span>}
              </button>

              {images.length > 1 && (
                <>
                  <button type="button" className="gallery-arrow gallery-prev" onClick={(event) => { event.stopPropagation(); move(-1); }} aria-label="이전 사진">‹</button>
                  <button type="button" className="gallery-arrow gallery-next" onClick={(event) => { event.stopPropagation(); move(1); }} aria-label="다음 사진">›</button>
                </>
              )}
            </div>

            <div className="detail-body">
              <h1 className="dog-name">{dog.name}</h1>
              <p className="meta">{dog.gender} ㅣ 중성화 {dog.neutered ? 'O' : 'X'} ㅣ {getAgeInfo(dog).display}</p>
              {(getAgeInfo(dog).reference || dog.shelter_name || getShelterUrl(dog.shelter_url)) && (
                <div className="profile-facts">
                  {getAgeInfo(dog).reference && <p><strong>나이 안내 기준</strong>{getAgeInfo(dog).reference}</p>}
                  {(dog.shelter_name || getShelterUrl(dog.shelter_url)) && (
                    <p><strong>출신 보호소</strong>{dog.shelter_name || '보호소 홈페이지'}{' '}
                      {getShelterUrl(dog.shelter_url) && <a href={getShelterUrl(dog.shelter_url)} target="_blank" rel="noopener noreferrer">홈페이지 방문 ↗</a>}
                    </p>
                  )}
                </div>
              )}
              {story.introduction && <p className="desc story-intro">{story.introduction}</p>}
              <div className="story-answers">
                {STORY_FIELDS.map(([key, label]) => story.answers[key] ? (
                  <section className="story-answer" key={key}>
                    <h2>{label}</h2>
                    <p>{story.answers[key]}</p>
                  </section>
                ) : null)}
                {story.extra_questions.filter(({ question, answer }) => question && answer).map(({ question, answer }, index) => (
                  <section className="story-answer" key={`${question}-${index}`}>
                    <h2>{question}</h2>
                    <p>{answer}</p>
                  </section>
                ))}
              </div>
              {!story.introduction && !STORY_FIELDS.some(([key]) => story.answers[key]) && story.extra_questions.length === 0 && <p className="desc">아직 소개글이 등록되지 않았어요.</p>}
            </div>
          </article>
        )}
      </section>

      {modalOpen && hasImages && (
        <div className="image-modal viewer-modal" onClick={() => setModalOpen(false)}>
          <button className="modal-close" aria-label="닫기">×</button>
          {images.length > 1 && (
            <button type="button" className="modal-nav modal-prev" aria-label="이전 사진" onClick={(event) => { event.stopPropagation(); move(-1); }}>‹</button>
          )}
          <img
            src={images[index]}
            alt={`${dog.name} 크게 보기 ${index + 1}`}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={onModalPointerDown}
            onPointerUp={onModalPointerUp}
          />
          {images.length > 1 && (
            <button type="button" className="modal-nav modal-next" aria-label="다음 사진" onClick={(event) => { event.stopPropagation(); move(1); }}>›</button>
          )}
        </div>
      )}
    </main>
  );
}
