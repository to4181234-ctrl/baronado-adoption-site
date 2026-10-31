'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CATEGORY_RESIDENT, fetchDog } from '../../../lib/dogs';
import SiteHeader from '../../../components/SiteHeader';
import DogLoading from '../../../components/DogLoading';
import ExpandableText from '../../../components/ExpandableText';
import DogActions from '../../../components/DogActions';
import { recordVisit } from '../../../lib/siteAnalytics';
import { formatDogDate, getAgeInfo, getDogBirthDate, getDogProfile, getShelterUrl, isDogBirthday, PROFILE_FIELDS } from '../../../lib/dogProfile';
import { dogVideoMedia, orderedDogMedia } from '../../../lib/dogVideo';
import VaccinationDetails from '../../../components/VaccinationDetails';
import GoDogRecords from '../../../components/GoDogRecords';

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
  const didSwipe = useRef(false);

  useEffect(() => {
    if (!params?.id) return;
    fetchDog(params.id)
      .then(setDog)
      .catch(() => setError('게시글을 찾을 수 없어요.'))
      .finally(() => setLoading(false));
  }, [params?.id]);

  useEffect(() => {
    if (dog?.id) recordVisit('dog', dog.id);
  }, [dog?.id]);

  const media = dog ? orderedDogMedia(dog.images || [], dogVideoMedia(dog.profile, process.env.NEXT_PUBLIC_SUPABASE_URL)) : [];
  const current = media[index];
  const hasMedia = media.length > 0;
  const backHref = dog?.category === CATEGORY_RESIDENT ? '/residents' : '/';

  const move = (direction) => {
    if (!hasMedia) return;
    setIndex((prev) => (prev + direction + media.length) % media.length);
  };

  const openImage = () => {
    if (didSwipe.current) { didSwipe.current = false; return; }
    if (current?.type !== 'photo') return;
    setModalOpen(true);
  };

  const onPointerDown = (event) => {
    startX.current = event.clientX;
    didSwipe.current = false;
  };

  const onPointerUp = (event) => {
    if (startX.current === null) return;
    const diff = event.clientX - startX.current;
    if (Math.abs(diff) > 35) { didSwipe.current = true; move(diff < 0 ? 1 : -1); }
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
    <main className="site-shell v3-site v3-detail-site">
      <SiteHeader />
      <section className="container detail-container has-detail-actions">
        <div className="v3-detail-banner"><Link className="v3-back" href={backHref}>‹ 뒤로 가기</Link><strong>{dog?.category===CATEGORY_RESIDENT?"상주견 소개":"가족을 찾아요"}</strong></div>

        {loading && <DogLoading />}
        {error && <div className="message error">{error}</div>}

        {dog && (
          <article className="detail-card">
            <div
              className="gallery"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              title={current?.type === 'photo' ? '사진 크게 보기' : undefined}
            >
              {current?.type === 'video'
                ? <div className="gallery-main gallery-video-frame"><video key={current.url} src={current.url} poster={current.poster || undefined} controls preload="none" playsInline aria-label={`${dog.name} 동영상 ${index + 1 - (dog.images || []).length}`} /></div>
                : <button type="button" className="gallery-main" onClick={openImage} aria-label="사진 크게 보기" disabled={!hasMedia}>
                    {current ? <img src={current.url} alt={`${dog.name} 사진 ${index + 1}`} /> : <PawIcon />}
                    {current && <span className="zoom-hint" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.8" cy="10.8" r="6.7" /><path d="m16 16 4.5 4.5M8 10.8h5.6m-2.8-2.8v5.6" /></svg></span>}
                  </button>}
              {dog.adopted && <span className="adopted-badge detail"><strong>입양 완료</strong>{dog.adopted_at && <small>{formatDogDate(dog.adopted_at)}</small>}</span>}

              {media.length > 1 && <span className="photo-count" aria-live="polite">{current?.type === 'video' ? '동영상' : '사진'} {index + 1} / {media.length}</span>}

              {media.length > 1 && (
                <>
                  <button type="button" className="gallery-arrow gallery-prev" onClick={(event) => { event.stopPropagation(); move(-1); }} aria-label="이전 미디어">‹</button>
                  <button type="button" className="gallery-arrow gallery-next" onClick={(event) => { event.stopPropagation(); move(1); }} aria-label="다음 미디어">›</button>
                </>
              )}
            </div>

            <div className="detail-body">
              <h1 className="dog-name">{dog.name}{isDogBirthday(dog) && <span className="birthday-icon" role="img" aria-label="생일 축하"> 🎉</span>}</h1>
              <p className="meta">{dog.gender} ㅣ 중성화 {dog.neutered ? 'O' : 'X'} ㅣ {getAgeInfo(dog).detailDisplay}</p>
              {getDogBirthDate(dog) && <p className="arrival-date">생년월일 · {formatDogDate(getDogBirthDate(dog))}</p>}
              {dog.category !== CATEGORY_RESIDENT && getAgeInfo(dog).referenceDisplay && <p className="arrival-date">{getAgeInfo(dog).referenceDisplay}</p>}
              {dog.category !== CATEGORY_RESIDENT && dog.arrived_at && <p className="arrival-date">바로나도에 온 날 · {formatDogDate(dog.arrived_at)}</p>}
              {dog.category !== CATEGORY_RESIDENT && dog.adopted && dog.adopted_at && <p className="arrival-date">입양 간 날짜 · {formatDogDate(dog.adopted_at)}</p>}
              {dog.category === CATEGORY_RESIDENT
                ? <ExpandableText key={dog.id} text={dog.description || '아직 소개글이 등록되지 않았어요.'} className="desc" />
                : <div className="profile-detail">
                    {getDogProfile(dog).introduction && <ExpandableText key={`${dog.id}-intro`} text={getDogProfile(dog).introduction} className="desc" />}
                    {PROFILE_FIELDS.map(field => field.key === 'vaccinations'
                      ? <VaccinationDetails key={`${dog.id}-vaccinations`} profile={getDogProfile(dog)} />
                      : getDogProfile(dog)[field.key] ? <section className="profile-section" key={`${dog.id}-${field.key}`}><h2>{field.label}</h2><ExpandableText text={getDogProfile(dog)[field.key]} /></section> : null
                    )}
                    {Array.isArray(getDogProfile(dog).extra_questions) && getDogProfile(dog).extra_questions.filter(entry => entry.question && entry.answer).map((entry, questionIndex) =>
                      <section className="profile-section" key={`${dog.id}-question-${questionIndex}`}><h2>{entry.question}</h2><ExpandableText text={entry.answer} /></section>
                    )}
                    {getDogProfile(dog).shelter_name && <section className="profile-section"><h2>어느 보호소에서 왔나요?</h2><p>{getDogProfile(dog).shelter_name}</p>{getShelterUrl(getDogProfile(dog).shelter_url) && <a className="shelter-link" href={getShelterUrl(getDogProfile(dog).shelter_url)} target="_blank" rel="noopener noreferrer">보호소 홈페이지 ↗</a>}</section>}
                    {!getDogProfile(dog).introduction && !PROFILE_FIELDS.some(field => getDogProfile(dog)[field.key]) && <ExpandableText key={`${dog.id}-fallback`} text={dog.description || '아직 소개글이 등록되지 않았어요.'} className="desc" />}
                  </div>}
              {dog.category === CATEGORY_RESIDENT && <VaccinationDetails profile={dog.profile} />}
            </div>
          </article>
        )}
        {dog&&dog.category!==CATEGORY_RESIDENT&&<GoDogRecords key={dog.id} dog={dog}/>}
      </section>

      {dog && <DogActions dog={dog} hidden={modalOpen} />}

      {modalOpen && hasMedia && (
        <div className="image-modal viewer-modal" onClick={() => setModalOpen(false)}>
          <button className="modal-close" aria-label="닫기">×</button>
          {media.length > 1 && (
            <button type="button" className="modal-nav modal-prev" aria-label="이전 미디어" onClick={(event) => { event.stopPropagation(); move(-1); }}>‹</button>
          )}
          {current?.type === 'video'
            ? <video key={current.url} src={current.url} poster={current.poster || undefined} controls preload="none" playsInline onClick={event => event.stopPropagation()} aria-label={`${dog.name} 동영상`} />
            : <img src={current?.url} alt={`${dog.name} 크게 보기 ${index + 1}`} onClick={(event) => event.stopPropagation()} onPointerDown={onModalPointerDown} onPointerUp={onModalPointerUp} />}
          {media.length > 1 && <span className="photo-count modal-count" aria-live="polite">{current?.type === 'video' ? '동영상' : '사진'} {index + 1} / {media.length}</span>}
          {media.length > 1 && (
            <button type="button" className="modal-nav modal-next" aria-label="다음 미디어" onClick={(event) => { event.stopPropagation(); move(1); }}>›</button>
          )}
        </div>
      )}
    </main>
  );
}
