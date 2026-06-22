'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CATEGORY_ADOPTION, CATEGORY_LABELS, CATEGORY_RESIDENT, fetchDog, normalizeCategory, updateDog } from '../../../../lib/dogs';
import SiteHeader from '../../../../components/SiteHeader';

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
      .then((dog) => setForm(dog))
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

              {(form.images?.length > 0 || files.length > 0) && (
                <div className="preview-grid">
                  {form.images?.map((url) => (
                    <div className="preview" key={url}>
                      <img src={url} alt="등록된 사진" />
                      <button type="button" onClick={() => removeImage(url)}>×</button>
                    </div>
                  ))}
                  {files.map((file, index) => (
                    <div className="preview" key={`${file.name}-${index}`}>
                      <img src={URL.createObjectURL(file)} alt="새 사진 미리보기" />
                      <button type="button" onClick={() => removeSelectedFile(index)}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <span className="label">*사진 등록 최대 3장</span>

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

              <label className="check-row">
                <span>입양 완료</span>
                <input type="checkbox" name="adopted" checked={Boolean(form.adopted)} onChange={onChange} />
                <strong>O</strong>
              </label>

              <label>
                <span className="label">설명글</span>
                <textarea className="field" name="description" value={form.description ?? ''} onChange={onChange} />
              </label>

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
