'use client';

import { useEffect, useState } from 'react';
import { CATEGORY_RESIDENT } from '../lib/dogs';
import { formatDogDate, getAgeInfo, getDogProfile, getShelterUrl, isResidentBirthday, PROFILE_FIELDS } from '../lib/dogProfile';

export default function AdminPreview({ form, items, onClose }) {
  const [photos, setPhotos] = useState([]);
  useEffect(() => {
    const urls = items.map(item => item.file ? URL.createObjectURL(item.file) : item.url);
    setPhotos(urls);
    return () => items.forEach((item, index) => { if (item.file) URL.revokeObjectURL(urls[index]); });
  }, [items]);
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const profile = getDogProfile(form);
  const resident = form.category === CATEGORY_RESIDENT;
  const age = getAgeInfo(form);
  return <div className="admin-preview-backdrop" role="dialog" aria-modal="true" aria-label="저장 전 이용자 페이지 미리보기">
    <div className="admin-preview-shell">
      <div className="admin-preview-bar"><strong>저장 전 미리보기</strong><button type="button" onClick={onClose} aria-label="미리보기 닫기">닫기 ×</button></div>
      <p className="small-note">현재 입력한 내용입니다. 게시글을 저장해야 이용자 페이지에 반영됩니다.</p>
      <article className="detail-card preview-detail">
        <div className="preview-photo-area">
          <div className="gallery preview-main-photo">
            {photos[0] ? <img src={photos[0]} alt={`${form.name || '강아지'} 대표 사진`} /> : <span>등록된 사진이 없어요</span>}
            {form.adopted && <span className="adopted-badge detail">입양 완료</span>}
          </div>
          {photos.length > 1 && <div className="preview-thumbnails">{photos.map((url, index) => <img key={index} src={url} alt={`${index + 1}번째 사진`} />)}</div>}
        </div>
        <div className="detail-body">
          <h1 className="dog-name">{form.name || '이름 미정'}{isResidentBirthday(form) && <span className="birthday-icon" role="img" aria-label="생일 축하"> 🎉</span>}</h1>
          <p className="meta">{form.gender} ㅣ 중성화 {form.neutered ? 'O' : 'X'} ㅣ {age.detailDisplay}</p>
          {!resident && age.referenceDisplay && <p className="arrival-date">{age.referenceDisplay}</p>}
          {!resident && form.arrived_at && <p className="arrival-date">바로나도에 온 날 · {formatDogDate(form.arrived_at)}</p>}
          {!resident && form.adopted && form.adopted_at && <p className="arrival-date">입양 간 날짜 · {formatDogDate(form.adopted_at)}</p>}
          {resident ? <p className="preview-prose">{form.description || '아직 소개글이 등록되지 않았어요.'}</p> : <div className="profile-detail">
            {profile.introduction && <p className="preview-prose">{profile.introduction}</p>}
            {PROFILE_FIELDS.filter(field => profile[field.key]).map(field => <section className="profile-section" key={field.key}><h2>{field.label}</h2><p>{profile[field.key]}</p></section>)}
            {Array.isArray(profile.extra_questions) && profile.extra_questions.filter(item => item.question && item.answer).map((item,index) => <section className="profile-section" key={index}><h2>{item.question}</h2><p>{item.answer}</p></section>)}
            {profile.shelter_name && <section className="profile-section"><h2>어느 보호소에서 왔나요?</h2><p>{profile.shelter_name}</p>{getShelterUrl(profile.shelter_url) && <span className="shelter-link">보호소 홈페이지 ↗</span>}</section>}
            {!profile.introduction && !PROFILE_FIELDS.some(field => profile[field.key]) && <p className="preview-prose">{form.description || '아직 소개글이 등록되지 않았어요.'}</p>}
          </div>}
        </div>
      </article>
    </div>
  </div>;
}
