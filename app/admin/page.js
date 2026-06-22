'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CATEGORY_ADOPTION, CATEGORY_LABELS, CATEGORY_RESIDENT, deleteDog, fetchDogs, normalizeCategory } from '../../lib/dogs';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import SiteHeader from '../../components/SiteHeader';

function PawIcon() {
  return <svg className="paw" viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M20.3 27.1c4.1 0 7.4 4.3 7.4 9.6s-3.3 9.6-7.4 9.6-7.4-4.3-7.4-9.6 3.3-9.6 7.4-9.6Zm23.4 0c4.1 0 7.4 4.3 7.4 9.6s-3.3 9.6-7.4 9.6-7.4-4.3-7.4-9.6 3.3-9.6 7.4-9.6ZM15.9 17.7c3 0 5.4 3.1 5.4 6.9s-2.4 6.9-5.4 6.9-5.4-3.1-5.4-6.9 2.4-6.9 5.4-6.9Zm32.2 0c3 0 5.4 3.1 5.4 6.9s-2.4 6.9-5.4 6.9-5.4-3.1-5.4-6.9 2.4-6.9 5.4-6.9ZM32 11.2c3.2 0 5.8 3.4 5.8 7.6s-2.6 7.6-5.8 7.6-5.8-3.4-5.8-7.6 2.6-7.6 5.8-7.6Zm0 29.1c7 0 14.1 5.8 14.1 11.5 0 4.1-3.6 5.3-7.8 4.3-2.1-.5-4.1-1.4-6.3-1.4s-4.2.9-6.3 1.4c-4.2 1-7.8-.2-7.8-4.3 0-5.7 7.1-11.5 14.1-11.5Z"/></svg>;
}

function AdminContent() {
  const searchParams = useSearchParams();
  const currentCategory = normalizeCategory(searchParams.get('category'));
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [target, setTarget] = useState(null);
  const [doneMessage, setDoneMessage] = useState('');

  const load = () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setError('');
    setLoading(true);
    fetchDogs(currentCategory)
      .then(setDogs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [currentCategory]);

  const confirmDelete = async () => {
    if (!target) return;
    try {
      await deleteDog(target.id);
      setTarget(null);
      setDoneMessage('삭제가 완료되었습니다');
      load();
    } catch (err) {
      setError(err.message);
      setTarget(null);
    }
  };

  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="container admin-container">
        <div className="admin-tabs">
          <Link className={`tab ${currentCategory === CATEGORY_ADOPTION ? 'active' : ''}`} href="/admin?category=adoption">가족을 찾아요</Link>
          <Link className={`tab ${currentCategory === CATEGORY_RESIDENT ? 'active' : ''}`} href="/admin?category=resident">상주견 소개</Link>
        </div>

        <div className="page-head admin-head">
          <h1>{CATEGORY_LABELS[currentCategory]}</h1>
          <Link href={`/admin/new?category=${currentCategory}`} className="btn">추가하기</Link>
        </div>

        {!isSupabaseConfigured && <div className="message error">Supabase 환경변수가 아직 연결되지 않았어요.</div>}
        {error && <div className="message error">{error}</div>}
        {loading && <div className="empty-state">게시글을 불러오는 중이에요.</div>}

        {!loading && dogs.length === 0 && (
          <div className="empty-state compact">아직 업로드된 게시글이 없어요</div>
        )}

        {!loading && dogs.length > 0 && (
          <div className="dog-list">
            {dogs.map((dog) => (
              <article className="dog-card admin-card" key={dog.id}>
                <div className="dog-thumb">
                  {dog.images?.[0] ? <img src={dog.images[0]} alt={`${dog.name} 사진`} /> : <PawIcon />}
                  {dog.adopted && <div className="adopted-badge">입양 완료</div>}
                </div>
                <div className="dog-info">
                  <h2 className="dog-name">{dog.name}</h2>
                  <p className="meta">{dog.gender} ㅣ 중성화 {dog.neutered ? 'O' : 'X'} ㅣ {dog.age}</p>
                  <p className="desc">{dog.description || '아직 소개글이 등록되지 않았어요.'}</p>
                  <div className="admin-actions">
                    <Link className="btn secondary" href={`/dogs/${dog.id}`}>자세히 보기</Link>
                    <Link className="btn" href={`/admin/edit/${dog.id}`}>수정하기</Link>
                    <button className="btn danger" onClick={() => setTarget(dog)}>삭제하기</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {target && (
        <div className="image-modal">
          <div className="modal-card">
            <p>삭제하시겠습니까?</p>
            <div className="modal-actions">
              <button className="btn danger" onClick={confirmDelete}>예</button>
              <button className="btn secondary" onClick={() => setTarget(null)}>아니오</button>
            </div>
          </div>
        </div>
      )}

      {doneMessage && (
        <div className="image-modal">
          <div className="modal-card">
            <p>{doneMessage}</p>
            <button className="btn" onClick={() => setDoneMessage('')}>OK</button>
          </div>
        </div>
      )}
    </main>
  );
}


export default function AdminPage() {
  return (
    <Suspense fallback={<main className="site-shell"><SiteHeader /><section className="container"><div className="empty-state compact">게시글을 불러오는 중이에요.</div></section></main>}>
      <AdminContent />
    </Suspense>
  );
}
