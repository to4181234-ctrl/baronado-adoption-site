'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CATEGORY_ADOPTION, CATEGORY_LABELS, CATEGORY_RESIDENT, fetchDog, normalizeCategory, updateDog } from '../../../../lib/dogs';
import SiteHeader from '../../../../components/SiteHeader';
import DogImagePicker from '../../../../components/DogImagePicker';
import { PROFILE_FIELDS, getDogProfile } from '../../../../lib/dogProfile';

export default function EditDogPage() {
  const router = useRouter();
  const params = useParams();
  const [form, setForm] = useState(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    fetchDog(params.id)
      .then((dog) => setForm({ ...dog, profile: dog.category === CATEGORY_ADOPTION ? getDogProfile(dog) : {} }))
      .catch(() => setError('게시글을 찾을 수 없어요.'));
  }, [params?.id]);

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const removeImage = (url) => {
    setForm((prev) => ({ ...prev, images: (prev.images ?? []).filter((image) => image !== url) }));
  };

  const onFileChange = (event) => {
    const selected = Array.from(event.target.files ?? []);
    setFiles((prev) => {
      const currentImageCount = form?.images?.length ?? 0;
      const remaining = Math.max(0, 3 - currentImageCount);
      return [...prev, ...selected].slice(0, remaining);
    });
    event.target.value = '';
  };

  const removeSelectedFile = (index) => {
    setFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const saved = await updateDog(params.id, form, files);
      setForm(saved);
      setFiles([]);
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

            <form className="form" onSubmit={onSubmit}>
              <DogImagePicker existing={form.images ?? []} files={files} setFiles={setFiles} setExisting={(updater) => setForm(prev => ({ ...prev, images: typeof updater === "function" ? updater(prev.images ?? []) : updater }))} />

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

              <label>
                <span className="label">*나이</span>
                <input className="field" name="age" value={form.age ?? ''} onChange={onChange} />
              </label>

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
              {form.category === CATEGORY_ADOPTION && <fieldset className="profile-editor">
                <legend>상세 소개 질문</legend>
                <label className="check-row"><input type="checkbox" checked={PROFILE_FIELDS.every(field => Object.hasOwn(form.profile||{},field.key))} onChange={event=>setForm(prev=>({...prev,profile:event.target.checked?Object.fromEntries(PROFILE_FIELDS.map(field=>[field.key,prev.profile?.[field.key]||''])):{}}))}/> 전체 선택</label>
                {PROFILE_FIELDS.map(field=><div className="profile-field" key={field.key}>
                  <label className="check-row"><input type="checkbox" checked={Object.hasOwn(form.profile||{},field.key)} onChange={event=>setForm(prev=>{const profile={...prev.profile};if(event.target.checked)profile[field.key]='';else delete profile[field.key];return {...prev,profile};})}/>{field.label}</label>
                  {Object.hasOwn(form.profile||{},field.key) && <textarea className="field" rows={3} value={form.profile[field.key]} onChange={event=>setForm(prev=>({...prev,profile:{...prev.profile,[field.key]:event.target.value}}))}/>}
                </div>)}
              </fieldset>}
              {form.category === CATEGORY_RESIDENT && <label>
                <span className="label">설명글</span>
                <textarea className="field" name="description" value={form.description ?? ''} onChange={onChange} />
              </label>}

              <div className="form-footer">
                <button className="btn full" disabled={saving}>{saving ? '수정 중...' : '수정하기'}</button>
              </div>
            </form>
          </>
        )}
      </section>

      {done && (
        <div className="image-modal">
          <div className="modal-card">
            <p>수정이 완료되었습니다</p>
            <button className="btn" onClick={() => router.push(`/admin?category=${backCategory}`)}>OK</button>
          </div>
        </div>
      )}
    </main>
  );
}
