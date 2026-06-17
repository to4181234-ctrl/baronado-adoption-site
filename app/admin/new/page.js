'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createDog, getEmptyDog } from '../../../lib/dogs';

export default function NewDogPage() {
  const router = useRouter();
  const [form, setForm] = useState(getEmptyDog());
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const onFileChange = (event) => {
    setFiles(Array.from(event.target.files ?? []));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await createDog(form, files);
      router.push('/admin');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <main className="site-shell">
      <header className="top-bar"><span className="text-logo">바로나도</span></header>
      <section className="container narrow">
        <Link className="back-link" href="/admin">뒤로 가기</Link>
        <form className="form" onSubmit={onSubmit}>
          <div className="upload-row">
            <label className="upload-box">
              대표 사진<br />클릭해서<br />업로드하세요
              <input type="file" accept="image/*" multiple onChange={onFileChange} hidden />
            </label>
            <label className="upload-box">
              추가 사진
              <input type="file" accept="image/*" multiple onChange={onFileChange} hidden />
            </label>
            <label className="upload-box">
              추가 사진
              <input type="file" accept="image/*" multiple onChange={onFileChange} hidden />
            </label>
          </div>

          {files.length > 0 && (
            <div className="small-note">선택된 사진 {files.length}장. 첫 번째 사진이 대표 이미지로 표시돼요.</div>
          )}

          <label>
            <span className="label">*사진 등록 최대 3장</span>
          </label>

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

          <div className="radio-group">
            <span className="label">중성화</span>
            <label><input type="checkbox" name="neutered" checked={form.neutered} onChange={onChange} /> O</label>
          </div>

          <label>
            <span className="label">설명글</span>
            <textarea className="field" name="description" value={form.description} onChange={onChange} placeholder="아이의 성격, 구조 배경, 특이사항 등을 적어주세요." />
          </label>

          {error && <div className="message error">{error}</div>}

          <div className="form-footer">
            <button className="btn full" disabled={saving}>{saving ? '저장 중...' : '등록하기'}</button>
          </div>
        </form>
      </section>
    </main>
  );
}
