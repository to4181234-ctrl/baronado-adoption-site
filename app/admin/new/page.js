'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CATEGORY_ADOPTION, CATEGORY_LABELS, CATEGORY_RESIDENT, createDog, getEmptyDog, normalizeCategory } from '../../../lib/dogs';
import AdminGuard from '../../../components/AdminGuard';
import SiteHeader from '../../../components/SiteHeader';
import DogImagePicker from '../../../components/DogImagePicker';
import AdoptionExtras from '../../../components/AdoptionExtras';
import AgeEditor from '../../../components/AgeEditor';
import VaccinationEditor from '../../../components/VaccinationEditor';
import DogVideoPicker from '../../../components/DogVideoPicker';
import ProfileQuestionEditor from '../../../components/ProfileQuestionEditor';
import AdminPreview from '../../../components/AdminPreview';
import useAdminDraftProtection from '../../../components/useAdminDraftProtection';
import { draftSnapshot } from '../../../lib/adminDraft';
import useAdminAutosave from '../../../components/useAdminAutosave';
import AdminAutosaveNotice from '../../../components/AdminAutosaveNotice';

function NewDogForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = normalizeCategory(searchParams.get('category'));
  const [form, setForm] = useState(getEmptyDog(initialCategory));
  const [photoItems, setPhotoItems] = useState([]);
  const [videoItems, setVideoItems] = useState([]);
  const [baseline, setBaseline] = useState(() => draftSnapshot(getEmptyDog(initialCategory), [], []));
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm((prev) => ({ ...prev, category: initialCategory }));
  }, [initialCategory]);

  const dirty = draftSnapshot(form, photoItems, videoItems) !== baseline;
  const autosave = useAdminAutosave({ scope: 'new', form, photos: photoItems, videos: videoItems, baseline, dirty,
    setForm, setPhotos: setPhotoItems, setVideos: setVideoItems });
  useAdminDraftProtection(dirty && autosave.ready);

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'arrived_at' && !value && prev.profile?.age_kind === 'estimated' && prev.profile.age_auto_update) {
        next.profile = { ...prev.profile, age_auto_update: false };
      }
      return next;
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const saved = await createDog(form, photoItems, videoItems);
      autosave.clear();
      setBaseline(draftSnapshot(form, photoItems, videoItems));
      router.replace(`/admin?category=${saved.category}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="container narrow form-container">
        <Link className="back-link" href={`/admin?category=${form.category}`}>뒤로 가기</Link>
        <div className="page-head stacked-head">
          <h1>{CATEGORY_LABELS[form.category]} 등록</h1>
        </div>

        <AdminAutosaveNotice autosave={autosave} />
        {autosave.ready && <form className="form" onSubmit={onSubmit}>
          <DogImagePicker items={photoItems} setItems={setPhotoItems} />
          <DogVideoPicker items={videoItems} setItems={setVideoItems} />

          <fieldset className="field-group">
            <legend className="label">게시 위치</legend>
            <div className="radio-group wrap">
              <label><input type="radio" name="category" value={CATEGORY_ADOPTION} checked={form.category === CATEGORY_ADOPTION} onChange={onChange} /> 가족을 찾아요</label>
              <label><input type="radio" name="category" value={CATEGORY_RESIDENT} checked={form.category === CATEGORY_RESIDENT} onChange={onChange} /> 상주견 소개</label>
            </div>
          </fieldset>

          <label>
            <span className="label">이름</span>
            <input className="field" name="name" value={form.name} onChange={onChange} placeholder="이름" />
          </label>

          <AgeEditor form={form} setForm={setForm} />

          <div className="radio-group">
            <span className="label">*성별</span>
            <label><input type="radio" name="gender" value="남자" checked={form.gender === '남자'} onChange={onChange} /> 남</label>
            <label><input type="radio" name="gender" value="여자" checked={form.gender === '여자'} onChange={onChange} /> 여</label>
          </div>

          <label className="check-row">
            <span>중성화</span>
            <input type="checkbox" name="neutered" checked={form.neutered} onChange={onChange} />
            <strong>O</strong>
          </label>

          {form.category === CATEGORY_ADOPTION && <div className="optional-date-field"><label><span className="label">바로나도에 온 날 <small>(선택)</small></span><input type="date" className="field" name="arrived_at" value={form.arrived_at || ''} onChange={onChange}/></label><button type="button" className="optional-date-clear" disabled={!form.arrived_at} onClick={() => setForm(prev => ({...prev,arrived_at:'',profile:prev.profile?.age_kind==='estimated'&&prev.profile.age_auto_update?{...prev.profile,age_auto_update:false}:prev.profile}))}>날짜 지우기</button></div>}

          <label className="check-row">
            <span>입양 완료</span>
            <input type="checkbox" name="adopted" checked={form.adopted} onChange={onChange} />
            <strong>O</strong>
          </label>

          {form.category === CATEGORY_ADOPTION && form.adopted && <div className="optional-date-field"><label><span className="label">입양 간 날짜 <small>(선택)</small></span><input className="field" type="date" name="adopted_at" value={form.adopted_at || ''} onChange={onChange}/></label><button type="button" className="optional-date-clear" disabled={!form.adopted_at} onClick={() => setForm(prev => ({...prev,adopted_at:''}))}>날짜 지우기</button></div>}
          <VaccinationEditor form={form} setForm={setForm} />
          {form.category === CATEGORY_ADOPTION && <AdoptionExtras form={form} setForm={setForm} />}
          {form.category === CATEGORY_ADOPTION && <ProfileQuestionEditor form={form} setForm={setForm} />}
          {form.category === CATEGORY_RESIDENT && <label>
            <span className="label">설명글</span>
            <textarea className="field" name="description" value={form.description} onChange={onChange} placeholder="아이의 성격, 구조 배경, 특이사항 등을 적어주세요." />
          </label>}

          {error && <div className="message error">{error}</div>}

          <div className="form-footer">
            <button className="btn secondary" type="button" onClick={() => setPreview(true)}>저장 전 미리보기</button>
            <button className="btn full" disabled={saving}>{saving ? '저장 중...' : '등록하기'}</button>
          </div>
        </form>}
      </section>
      {preview && <AdminPreview form={form} items={photoItems} videoItems={videoItems} onClose={() => setPreview(false)} />}
    </main>
  );
}


export default function NewDogPage() {
  return (
    <Suspense fallback={<main className="site-shell"><SiteHeader /><section className="container narrow"><div className="empty-state compact">페이지를 불러오는 중이에요.</div></section></main>}>
      <AdminGuard><NewDogForm /></AdminGuard>
    </Suspense>
  );
}
