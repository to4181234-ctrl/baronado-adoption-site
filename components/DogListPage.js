'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchDogs } from '../lib/dogs';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import SiteHeader from './SiteHeader';
import DogLoading from './DogLoading';
import { formatDogDate, profileSummary } from '../lib/dogProfile';

function PawIcon() {
  return <svg className="paw" viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M20.3 27.1c4.1 0 7.4 4.3 7.4 9.6s-3.3 9.6-7.4 9.6-7.4-4.3-7.4-9.6 3.3-9.6 7.4-9.6Zm23.4 0c4.1 0 7.4 4.3 7.4 9.6s-3.3 9.6-7.4 9.6-7.4-4.3-7.4-9.6 3.3-9.6 7.4-9.6ZM15.9 17.7c3 0 5.4 3.1 5.4 6.9s-2.4 6.9-5.4 6.9-5.4-3.1-5.4-6.9 2.4-6.9 5.4-6.9Zm32.2 0c3 0 5.4 3.1 5.4 6.9s-2.4 6.9-5.4 6.9-5.4-3.1-5.4-6.9 2.4-6.9 5.4-6.9ZM32 11.2c3.2 0 5.8 3.4 5.8 7.6s-2.6 7.6-5.8 7.6-5.8-3.4-5.8-7.6 2.6-7.6 5.8-7.6Zm0 29.1c7 0 14.1 5.8 14.1 11.5 0 4.1-3.6 5.3-7.8 4.3-2.1-.5-4.1-1.4-6.3-1.4s-4.2.9-6.3 1.4c-4.2 1-7.8-.2-7.8-4.3 0-5.7 7.1-11.5 14.1-11.5Z"/></svg>;
}

function DogCard({ dog }) {
  const firstImage = dog.images?.[0];
  return (
    <article className="dog-card">
      <div className="dog-thumb">
        {firstImage ? <img src={firstImage} alt={`${dog.name} 사진`} /> : <PawIcon />}
        {dog.adopted && <div className="adopted-badge"><strong>입양 완료</strong>{dog.adopted_at && <small>{formatDogDate(dog.adopted_at)}</small>}</div>}
      </div>
      <div className="dog-info">
        <h2 className="dog-name">{dog.name}</h2>
        <p className="meta">{dog.gender} ㅣ 중성화 {dog.neutered ? 'O' : 'X'} ㅣ {dog.age}</p>
        {dog.category === 'adoption' && dog.arrived_at && <p className="arrival-date">바로나도에 온 날 · {formatDogDate(dog.arrived_at)}</p>}
        {dog.category === 'adoption' && dog.adopted && dog.adopted_at && <p className="arrival-date">입양 간 날짜 · {formatDogDate(dog.adopted_at)}</p>}
        <p className="desc">{dog.category === 'resident' ? dog.description : profileSummary(dog)}</p>
        <Link className="btn" href={`/dogs/${dog.id}`}>자세히 보기</Link>
      </div>
    </article>
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
  ).slice().sort((a, b) => sort === 'new'
    ? new Date(b.created_at) - new Date(a.created_at)
    : sort === 'old'
      ? new Date(a.created_at) - new Date(b.created_at)
      : Number(a.adopted) - Number(b.adopted) || new Date(b.created_at) - new Date(a.created_at));

  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="container list-container">
        <div className="page-head">
          <h1>{title}</h1>
        </div>

        {category === 'adoption' && (
          <div className="listing-controls">
            <div className="sort-tabs" role="group" aria-label="입양 상태별 보기">
              {[['all', '전체보기'], ['adopted', '입양 완료'], ['available', '입양 전']].map(([value, label]) => (
                <button key={value} type="button"
                  className={'sort-tab ' + (statusFilter === value ? 'active' : '')}
                  aria-pressed={statusFilter === value}
                  onClick={() => setStatusFilter(value)}>{label}</button>
              ))}
            </div>
            <span className="filter-divider" aria-hidden="true" />
            <div className="sort-tabs" role="group" aria-label="게시글 정렬">
              {[['new', '최신 등록'], ['old', '오래된 순']].map(([value, label]) => (
                <button key={value} type="button"
                  className={'sort-tab ' + (sort === value ? 'active' : '')}
                  aria-pressed={sort === value}
                  onClick={() => setSort((current) => current === value ? 'default' : value)}>{label}</button>
              ))}
            </div>
          </div>
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
