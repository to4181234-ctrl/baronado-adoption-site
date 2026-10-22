'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchDogs } from '../lib/dogs';
import { CATEGORY_ADOPTION } from '../lib/dogs';
import { getAgeInfo } from '../lib/profile';
import { storySummary } from '../lib/dog-story';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import SiteHeader from './SiteHeader';
import BrandLoader from './BrandLoader';

function PawIcon() {
  return <svg className="paw" viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M20.3 27.1c4.1 0 7.4 4.3 7.4 9.6s-3.3 9.6-7.4 9.6-7.4-4.3-7.4-9.6 3.3-9.6 7.4-9.6Zm23.4 0c4.1 0 7.4 4.3 7.4 9.6s-3.3 9.6-7.4 9.6-7.4-4.3-7.4-9.6 3.3-9.6 7.4-9.6ZM15.9 17.7c3 0 5.4 3.1 5.4 6.9s-2.4 6.9-5.4 6.9-5.4-3.1-5.4-6.9 2.4-6.9 5.4-6.9Zm32.2 0c3 0 5.4 3.1 5.4 6.9s-2.4 6.9-5.4 6.9-5.4-3.1-5.4-6.9 2.4-6.9 5.4-6.9ZM32 11.2c3.2 0 5.8 3.4 5.8 7.6s-2.6 7.6-5.8 7.6-5.8-3.4-5.8-7.6 2.6-7.6 5.8-7.6Zm0 29.1c7 0 14.1 5.8 14.1 11.5 0 4.1-3.6 5.3-7.8 4.3-2.1-.5-4.1-1.4-6.3-1.4s-4.2.9-6.3 1.4c-4.2 1-7.8-.2-7.8-4.3 0-5.7 7.1-11.5 14.1-11.5Z"/></svg>;
}

function DogCard({ dog }) {
  const firstImage = dog.images?.[0];
  return (
    <article className="dog-card">
      <div className="dog-thumb">
        {firstImage ? <img src={firstImage} alt={`${dog.name} 사진`} /> : <PawIcon />}
        {dog.adopted && <div className="adopted-badge">입양 완료</div>}
      </div>
      <div className="dog-info">
        <h2 className="dog-name">{dog.name}</h2>
        <p className="meta">{dog.gender} ㅣ 중성화 {dog.neutered ? 'O' : 'X'} ㅣ {getAgeInfo(dog).listDisplay}</p>
        <p className="desc">{storySummary(dog)}</p>
        <Link className="btn" href={`/dogs/${dog.id}`}>자세히 보기</Link>
      </div>
    </article>
  );
}

export default function DogListPage({ title, category }) {
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    Promise.all([fetchDogs(category), new Promise((resolve) => setTimeout(resolve, 750))])
      .then(([rows]) => { if (active) setDogs(rows); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [category]);

  const visibleDogs = dogs
    .filter((dog) => category !== CATEGORY_ADOPTION || statusFilter === 'all'
      || (statusFilter === 'waiting' ? !dog.adopted : dog.adopted))
    .sort((a, b) => (statusFilter === 'all' ? Number(a.adopted) - Number(b.adopted) : 0)
      || (sortOrder === 'newest' ? -1 : 1) * ((a.created_at || '').localeCompare(b.created_at || ''))
      || a.id.localeCompare(b.id));

  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="container list-container">
        <div className="page-head">
          <h1>{title}</h1>
        </div>

        <div className="list-controls" aria-label="목록 보기 설정">
          {category === CATEGORY_ADOPTION && (
            <div className="list-select-wrap">
              <select aria-label="입양 상태" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">전체보기</option>
                <option value="waiting">입양 전</option>
                <option value="adopted">입양 완료</option>
              </select>
            </div>
          )}
          <div className="list-select-wrap">
            <select aria-label="등록 순서" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
              <option value="newest">최신 등록</option>
              <option value="oldest">오래된 순</option>
            </select>
          </div>
        </div>

        {!isSupabaseConfigured && (
          <div className="message error">Supabase 환경변수가 아직 연결되지 않았어요. 배포 전 Vercel 환경변수를 입력해주세요.</div>
        )}

        {loading && (category === CATEGORY_ADOPTION ? <BrandLoader /> : <div className="empty-state">게시글을 불러오는 중이에요.</div>)}
        {error && <div className="message error">{error}</div>}

        {!loading && !error && dogs.length === 0 && (
          <div className="empty-state">아직 업로드된 게시글이 없어요</div>
        )}

        {!loading && !error && dogs.length > 0 && visibleDogs.length === 0 && (
          <div className="empty-state">선택한 조건에 맞는 친구가 없어요.</div>
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
