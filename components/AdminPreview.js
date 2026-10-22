'use client';

import { useEffect, useRef, useState } from 'react';
import { CATEGORY_RESIDENT } from '../lib/dogs';
import { formatDogDate, getAgeInfo, getDogBirthDate, getDogProfile, getShelterUrl, isDogBirthday, PROFILE_FIELDS } from '../lib/dogProfile';
import VaccinationDetails from './VaccinationDetails';
import { orderedDogMedia } from '../lib/dogVideo';

export default function AdminPreview({ form, items, videoItems = [], onClose }) {
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [mediaIndex, setMediaIndex] = useState(0);
  const touchStartX = useRef(null);
  useEffect(() => {
    const urls = items.map(item => item.file ? URL.createObjectURL(item.file) : item.url);
    setPhotos(urls);
    return () => items.forEach((item, index) => { if (item.file) URL.revokeObjectURL(urls[index]); });
  }, [items]);
  useEffect(() => {
    const urls = videoItems.map(item => item.file ? URL.createObjectURL(item.file) : item.url);
    setVideos(urls);
    return () => videoItems.forEach((item, index) => { if (item.file) URL.revokeObjectURL(urls[index]); });
  }, [videoItems]);
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const profile = getDogProfile(form);
  const resident = form.category === CATEGORY_RESIDENT;
  const age = getAgeInfo(form);
  const media = orderedDogMedia(photos, videos);
  const current = media[mediaIndex] || media[0];
  const move = direction => setMediaIndex(prev => (prev + direction + media.length) % media.length);
  return <div className="admin-preview-backdrop" role="dialog" aria-modal="true" aria-label="저장 전 이용자 페이지 미리보기">
    <div className="admin-preview-shell">
      <div className="admin-preview-bar"><strong>저장 전 미리보기</strong><button type="button" onClick={onClose} aria-label="미리보기 닫기">닫기 ×</button></div>
      <p className="small-note">현재 입력한 내용입니다. 게시글을 저장해야 이용자 페이지에 반영됩니다.</p>
      <article className="detail-card preview-detail">
        <div className="preview-photo-area">
          <div className="gallery preview-main-photo" onPointerDown={event => { touchStartX.current = event.clientX; }} onPointerUp={event => {
            if (touchStartX.current !== null && Math.abs(event.clientX - touchStartX.current) > 35 && media.length > 1) move(event.clientX < touchStartX.current ? 1 : -1);
            touchStartX.current = null;
          }}>
            {current?.type === 'photo' ? <img src={current.url} alt={`${form.name || '강아지'} 사진`} />
              : current?.type === 'video' ? <video key={current.url} src={current.url} controls preload="none" playsInline aria-label={`${form.name || '강아지'} 동영상`} />
                : <span>등록된 사진과 동영상이 없어요</span>}
            {form.adopted && <span className="adopted-badge detail">입양 완료</span>}
            {media.length > 1 && <>
              <span className="photo-count" aria-live="polite">{current?.type === 'video' ? '동영상' : '사진'} {(mediaIndex % media.length) + 1} / {media.length}</span>
              <button type="button" className="gallery-arrow gallery-prev" onClick={() => move(-1)} aria-label="이전 미디어">‹</button>
              <button type="button" className="gallery-arrow gallery-next" onClick={() => move(1)} aria-label="다음 미디어">›</button>
            </>}
          </div>
        </div>
        <div className="detail-body">
          <h1 className="dog-name">{form.name || '이름 미정'}{isDogBirthday(form) && <span className="birthday-icon" role="img" aria-label="생일 축하"> 🎉</span>}</h1>
          <p className="meta">{form.gender} ㅣ 중성화 {form.neutered ? 'O' : 'X'} ㅣ {age.detailDisplay}</p>
          {getDogBirthDate(form) && <p className="arrival-date">생년월일 · {formatDogDate(getDogBirthDate(form))}</p>}
          {!resident && age.referenceDisplay && <p className="arrival-date">{age.referenceDisplay}</p>}
          {!resident && form.arrived_at && <p className="arrival-date">바로나도에 온 날 · {formatDogDate(form.arrived_at)}</p>}
          {!resident && form.adopted && form.adopted_at && <p className="arrival-date">입양 간 날짜 · {formatDogDate(form.adopted_at)}</p>}
          {resident ? <p className="preview-prose">{form.description || '아직 소개글이 등록되지 않았어요.'}</p> : <div className="profile-detail">
            {profile.introduction && <p className="preview-prose">{profile.introduction}</p>}
            {PROFILE_FIELDS.map(field => field.key === 'vaccinations'
              ? <VaccinationDetails key="vaccinations" profile={profile} />
              : profile[field.key] ? <section className="profile-section" key={field.key}><h2>{field.label}</h2><p>{profile[field.key]}</p></section> : null)}
            {Array.isArray(profile.extra_questions) && profile.extra_questions.filter(item => item.question && item.answer).map((item,index) => <section className="profile-section" key={index}><h2>{item.question}</h2><p>{item.answer}</p></section>)}
            {profile.shelter_name && <section className="profile-section"><h2>어느 보호소에서 왔나요?</h2><p>{profile.shelter_name}</p>{getShelterUrl(profile.shelter_url) && <span className="shelter-link">보호소 홈페이지 ↗</span>}</section>}
            {!profile.introduction && !PROFILE_FIELDS.some(field => profile[field.key]) && <p className="preview-prose">{form.description || '아직 소개글이 등록되지 않았어요.'}</p>}
          </div>}
          {resident && <VaccinationDetails profile={profile} />}
        </div>
      </article>
    </div>
  </div>;
}
