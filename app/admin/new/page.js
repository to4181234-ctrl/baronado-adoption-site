'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CATEGORY_ADOPTION, CATEGORY_LABELS, CATEGORY_RESIDENT, createDog, getEmptyDog, normalizeCategory } from '../../../lib/dogs';
import SiteHeader from '../../../components/SiteHeader';
import DogImagePicker from '../../../components/DogImagePicker';
import { PROFILE_FIELDS } from '../../../lib/dogProfile';

function NewDogForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = normalizeCategory(searchParams.get('category'));
  const [form, setForm] = useState(getEmptyDog(initialCategory));
  const [files, setFiles] = useState([]);
  const [existing, setExisting] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm((prev) => ({ ...prev, category: initialCategory }));
  }, [initialCategory]);

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const onFileChange = (event) => {
    const selected = Array.from(event.target.files ?? []);
    setFiles((prev) => [...prev, ...selected].slice(0, 3));
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
      const saved = await createDog(form, files);
      router.push(`/admin?category=${saved.category}`);
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

        <form className="form" onSubmit={onSubmit}>
          <DogImagePicker existing={existing} files={files} setFiles={setFiles} setExisting={setExisting} />

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

          <label>
            <span className="label">*나이</span>
            <input className="field" name="age" value={form.age} onChange={onChange} placeholder="1살 추정" />
          </label>

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

          {form.category === CATEGORY_ADOPTION && <label><span className="label">바로나도에 온 날</span><input type="date" className="field" name="arrived_at" value={form.arrived_at || ''} onChange={onChange}/></label>}

          <label className="check-row">
            <span>입양 완료</span>
            <input type="checkbox" name="adopted" checked={form.adopted} onChange={onChange} />
            <strong>O</strong>
          </label>

          {form.category === CATEGORY_ADOPTION && form.adopted && <label><span className="label">입양 간 날짜</span><input className="field" type="date" name="adopted_at" value={form.adopted_at || ''} onChange={onChange}/></label>}
          {form.category === CATEGORY_ADOPTION && <fieldset className="profile-editor">
            <legend>상세 소개 질문</legend>
            <label className="check-row"><input type="checkbox" checked={PROFILE_FIELDS.every(field => Object.hasOwn(form.profile || {},field.key))} onChange={event => setForm(prev => ({...prev,profile:event.target.checked?Object.fromEntries(PROFILE_FIELDS.map(field=>[field.key,prev.profile?.[field.key]||''])):{}}))}/> 전체 선택</label>
            {PROFILE_FIELDS.map(field => <div key={field.key} className="profile-field">
              <label className="check-row"><input type="checkbox" checked={Object.hasOwn(form.profile||{},field.key)} onChange={event=>setForm(prev=>{const profile={...prev.profile};if(event.target.checked)profile[field.key]='';else delete profile[field.key];return {...prev,profile};})}/>{field.label}</label>
              {Object.hasOwn(form.profile||{},field.key) && <textarea className="field" rows={3} value={form.profile[field.key]} onChange={event=>setForm(prev=>({...prev,profile:{...prev.profile,[field.key]:event.target.value}}))} placeholder={field.label+' 내용을 입력하세요.'}/>}
            </div>)}
          </fieldset>}
          {form.category === CATEGORY_RESIDENT && <label>
            <span className="label">설명글</span>
            <textarea className="field" name="description" value={form.description} onChange={onChange} placeholder="아이의 성격, 구조 배경, 특이사항 등을 적어주세요." />
          </label>}

          {error && <div className="message error">{error}</div>}

          <div className="form-footer">
            <button className="btn full" disabled={saving}>{saving ? '저장 중...' : '등록하기'}</button>
          </div>
        </form>
      </section>
    </main>
  );
}


export default function NewDogPage() {
  return (
    <Suspense fallback={<main className="site-shell"><SiteHeader /><section className="container narrow"><div className="empty-state compact">페이지를 불러오는 중이에요.</div></section></main>}>
      <NewDogForm />
    </Suspense>
  );
}
