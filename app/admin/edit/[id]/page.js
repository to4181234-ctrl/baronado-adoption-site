'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CATEGORY_ADOPTION, CATEGORY_LABELS, CATEGORY_RESIDENT, fetchDog, normalizeCategory, updateDog } from '../../../../lib/dogs';
import AdminGuard from '../../../../components/AdminGuard';
import SiteHeader from '../../../../components/SiteHeader';
import DogImagePicker from '../../../../components/DogImagePicker';
import { getDogProfile } from '../../../../lib/dogProfile';
import AdoptionExtras from '../../../../components/AdoptionExtras';
import AgeEditor from '../../../../components/AgeEditor';
import VaccinationEditor from '../../../../components/VaccinationEditor';
import DogVideoPicker from '../../../../components/DogVideoPicker';
import ProfileQuestionEditor from '../../../../components/ProfileQuestionEditor';
import AdminPreview from '../../../../components/AdminPreview';
import useAdminDraftProtection from '../../../../components/useAdminDraftProtection';
import { draftSnapshot } from '../../../../lib/adminDraft';
import useAdminAutosave from '../../../../components/useAdminAutosave';
import AdminAutosaveNotice from '../../../../components/AdminAutosaveNotice';

function EditDogForm() {
  const router = useRouter();
  const params = useParams();
  const [form, setForm] = useState(null);
  const [photoItems, setPhotoItems] = useState([]);
  const [videoItems, setVideoItems] = useState([]);
  const [baseline, setBaseline] = useState('');
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    fetchDog(params.id)
      .then((dog) => {
        const nextForm = { ...dog, profile: dog.category === CATEGORY_ADOPTION ? { ...getDogProfile(dog), ...dog.profile } : (dog.profile || {}) };
        const nextPhotos = (dog.images || []).map(url => ({ id: url, url }));
        const nextVideos = (nextForm.profile.videos || []).map(url => ({ id: url, url, posterUrl: nextForm.profile.video_posters?.[url] || '' }));
        setForm(nextForm);
        setPhotoItems(nextPhotos);
        setVideoItems(nextVideos);
        setBaseline(draftSnapshot(nextForm, nextPhotos, nextVideos));
      })
      .catch(() => setError('게시글을 찾을 수 없어요.'));
  }, [params?.id]);

  const dirty = Boolean(form && baseline && draftSnapshot(form, photoItems, videoItems) !== baseline);
  const autosave = useAdminAutosave({ scope: `edit_${params?.id || ''}`, form, photos: photoItems, videos: videoItems,
    baseline, dirty, setForm, setPhotos: setPhotoItems, setVideos: setVideoItems });
  useAdminDraftProtection(dirty && !done && autosave.ready);

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const saved = await updateDog(params.id, form, photoItems, videoItems);
      autosave.clear();
      const savedPhotos = (saved.images || []).map(url => ({ id: url, url }));
      const savedVideos = (saved.profile?.videos || []).map(url => ({ id: url, url, posterUrl: saved.profile?.video_posters?.[url] || '' }));
      setForm(saved);
      setPhotoItems(savedPhotos);
      setVideoItems(savedVideos);
      setBaseline(draftSnapshot(saved, savedPhotos, savedVideos));
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const backCategory = normalizeCategory(form?.category);

  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="container narrow form-container">
        <Link className="back-link" href={`/admin?category=${backCategory}`}>뒤로 가기</Link>

        {!form && !error && <div className="empty-state compact">게시글을 불러오는 중이에요.</div>}
        {error && <div className="message error">{error}</div>}

        {form && (
          <>
            <div className="page-head stacked-head">
              <h1>{CATEGORY_LABELS[form.category]} 수정</h1>
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
                <input className="field" name="name" value={form.name ?? ''} onChange={onChange} />
              </label>

              <AgeEditor form={form} setForm={setForm} />

              <div className="radio-group">
                <span className="label">*성별</span>
                <label><input type="radio" name="gender" value="남자" checked={form.gender === '남자'} onChange={onChange} /> 남</label>
                <label><input type="radio" name="gender" value="여자" checked={form.gender === '여자'} onChange={onChange} /> 여</label>
              </div>

              <label className="check-row">
                <span>중성화</span>
                <input type="checkbox" name="neutered" checked={Boolean(form.neutered)} onChange={onChange} />
                <strong>O</strong>
              </label>

              {form.category === CATEGORY_ADOPTION && <label><span className="label">바로나도에 온 날</span><input type="date" className="field" name="arrived_at" value={form.arrived_at || ''} onChange={onChange}/></label>}
              <label className="check-row">
                <span>입양 완료</span>
                <input type="checkbox" name="adopted" checked={Boolean(form.adopted)} onChange={onChange} />
                <strong>O</strong>
              </label>

              {form.category === CATEGORY_ADOPTION && form.adopted && <label><span className="label">입양 간 날짜</span><input className="field" type="date" name="adopted_at" value={form.adopted_at || ''} onChange={onChange}/></label>}
              <VaccinationEditor form={form} setForm={setForm} />
              {form.category === CATEGORY_ADOPTION && <AdoptionExtras form={form} setForm={setForm} />}
              {form.category === CATEGORY_ADOPTION && <ProfileQuestionEditor form={form} setForm={setForm} />}
              {form.category === CATEGORY_RESIDENT && <label>
                <span className="label">설명글</span>
                <textarea className="field" name="description" value={form.description ?? ''} onChange={onChange} />
              </label>}

              <div className="form-footer">
                <button className="btn secondary" type="button" onClick={() => setPreview(true)}>저장 전 미리보기</button>
                <button className="btn full" disabled={saving}>{saving ? '수정 중...' : '수정하기'}</button>
              </div>
            </form>}
          </>
        )}
      </section>

      {preview && form && <AdminPreview form={form} items={photoItems} videoItems={videoItems} onClose={() => setPreview(false)} />}

      {done && (
        <div className="image-modal">
          <div className="modal-card">
            <p>수정이 완료되었습니다</p>
            <button className="btn" onClick={() => router.replace(`/admin?category=${backCategory}`)}>OK</button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function EditDogPage() {
  return <AdminGuard><EditDogForm /></AdminGuard>;
}
