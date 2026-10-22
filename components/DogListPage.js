'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchDogs } from '../lib/dogs';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import SiteHeader from './SiteHeader';
import DogLoading from './DogLoading';
import { formatDogDate, getAgeInfo, profileSummary } from '../lib/dogProfile';

function PawIcon() {
  return <svg className="paw" viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M20.3 27.1c4.1 0 7.4 4.3 7.4 9.6s-3.3 9.6-7.4 9.6-7.4-4.3-7.4-9.6 3.3-9.6 7.4-9.6Zm23.4 0c4.1 0 7.4 4.3 7.4 9.6s-3.3 9.6-7.4 9.6-7.4-4.3-7.4-9.6 3.3-9.6 7.4-9.6ZM15.9 17.7c3 0 5.4 3.1 5.4 6.9s-2.4 6.9-5.4 6.9-5.4-3.1-5.4-6.9 2.4-6.9 5.4-6.9Zm32.2 0c3 0 5.4 3.1 5.4 6.9s-2.4 6.9-5.4 6.9-5.4-3.1-5.4-6.9 2.4-6.9 5.4-6.9ZM32 11.2c3.2 0 5.8 3.4 5.8 7.6s-2.6 7.6-5.8 7.6-5.8-3.4-5.8-7.6 2.6-7.6 5.8-7.6Zm0 29.1c7 0 14.1 5.8 14.1 11.5 0 4.1-3.6 5.3-7.8 4.3-2.1-.5-4.1-1.4-6.3-1.4s-4.2.9-6.3 1.4c-4.2 1-7.8-.2-7.8-4.3 0-5.7 7.1-11.5 14.1-11.5Z"/></svg>;
}

function DogCard({ dog }) {
  const firstImage = dog.images?.[0];
  return (
    <Link className="dog-card dog-card-link" href={`/dogs/${dog.id}`} aria-label={`${dog.name} 상세 보기`}>
      <div className="dog-thumb">
        {firstImage ? <img src={firstImage} alt={`${dog.name} 사진`} /> : <PawIcon />}
        {dog.adopted && <div className="adopted-badge"><strong>입양 완료</strong>{dog.adopted_at && <small>{formatDogDate(dog.adopted_at)}</small>}</div>}
      </div>
      <div className="dog-info">
        <h2 className="dog-name">{dog.name}</h2>
        <p className="meta">{dog.gender} ㅣ 중성화 {dog.neutered ? 'O' : 'X'} ㅣ {getAgeInfo(dog).listDisplay}</p>
        {dog.category === 'adoption' && dog.arrived_at && <p className="arrival-date">바로나도에 온 날 · {formatDogDate(dog.arrived_at)}</p>}
        {dog.category === 'adoption' && dog.adopted && dog.adopted_at && <p className="arrival-date">입양 간 날짜 · {formatDogDate(dog.adopted_at)}</p>}
        <p className="desc">{dog.category === 'resident' ? dog.description : profileSummary(dog)}</p>
        <span className="btn">자세히 보기</span>
      </div>
    </Link>
  );
}

export default function DogListPage({ title, category }) {
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('default');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    fetchDogs(category)
      .then(setDogs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [category]);

  const visibleDogs = (category === 'adoption'
    ? dogs.filter((dog) => statusFilter === 'adopted'
      ? dog.adopted
      : statusFilter === 'available'
        ? !dog.adopted
        : true)
    : dogs
  ).slice().sort((a, b) =>
    (category === 'adoption' && statusFilter === 'all' ? Number(a.adopted) - Number(b.adopted) : 0)
    || (sort === 'old' ? 1 : -1) * String(a.created_at || '').localeCompare(String(b.created_at || ''))
    || String(a.id).localeCompare(String(b.id)));

  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="container list-container">
        <div className="page-head">
          <h1>{title}</h1>
        </div>

        {category === 'adoption' && (
          <div className="listing-controls">
            <select aria-label="입양 상태" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="all">전체보기</option>
              <option value="available">입양 전</option>
              <option value="adopted">입양 완료</option>
            </select>
            <select aria-label="등록 순서" value={sort} onChange={event => setSort(event.target.value)}>
              <option value="default">최신 등록</option>
              <option value="old">오래된 순</option>
            </select>
          </div>
        )}

        {!loading && !error && dogs.length > 0 && (
          <p className="result-count" aria-live="polite">
            {category === 'adoption' ? `${statusFilter === 'available' ? '입양 전' : statusFilter === 'adopted' ? '입양 완료' : '전체'} ${visibleDogs.length}마리` : `전체 ${visibleDogs.length}마리`}
          </p>
        )}

        {!isSupabaseConfigured && (
          <div className="message error">Supabase 환경변수가 아직 연결되지 않았어요. 배포 전 Vercel 환경변수를 입력해주세요.</div>
        )}

        {loading && <DogLoading />}
        {error && <div className="message error">{error}</div>}

        {!loading && !error && visibleDogs.length === 0 && (
          <div className="empty-state">
            {dogs.length === 0 ? '아직 업로드된 게시글이 없어요' : '해당 조건에 맞는 게시글이 없어요.'}
          </div>
        )}

        {!loading && !error && visibleDogs.length > 0 && (
          <div className="dog-list">
            {visibleDogs.map((dog) => <DogCard key={dog.id} dog={dog} />)}
          </div>
        )}
      </section>
    </main>
  );
}
