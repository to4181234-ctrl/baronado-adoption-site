'use client';

import { useEffect, useMemo, useState } from 'react';

function SelectedImage({ file, onRemove, onFirst, first }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <div className="photo-tile">
      <img src={url} alt={file.name} />
      {first && <span className="photo-primary">대표</span>}
      <div className="photo-controls">
        {!first && <button type="button" onClick={onFirst}>대표로</button>}
        <button type="button" onClick={onRemove} aria-label="사진 제외">삭제</button>
      </div>
    </div>
  );
}

export default function DogImagePicker({ existing = [], files, setFiles, setExisting, max = 3 }) {
  const total = existing.length + files.length;
  const [error, setError] = useState('');
  const add = (event) => {
    const candidates = Array.from(event.target.files || []);
    const accepted = candidates.filter(file => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024);
    const remaining = max - total;
    if (accepted.length !== candidates.length) setError('이미지 파일만 업로드할 수 있으며, 파일당 10MB 이하로 선택해주세요.');
    else if (accepted.length > remaining) setError('사진은 최대 3장까지 등록할 수 있어요.');
    else setError('');
    if (remaining > 0) setFiles(prev => [...prev, ...accepted.slice(0, remaining)]);
    event.target.value = '';
  };
  const makeExistingFirst = (index) => {
    setExisting(prev => [prev[index], ...prev.filter((_, i) => i !== index)]);
  };
  const makeFileFirst = (index) => {
    const chosen = files[index];
    setFiles(prev => [chosen, ...prev.filter((_, i) => i !== index)]);
    setExisting([]);
    // Existing photos remain available unless explicitly removed: a mixed order
    // requires a separate persisted ordering list (handled below).
  };
  return (
    <div className="image-picker">
      <label className="upload-pick">
        <span>+ 사진 추가</span>
        <small>{total}/{max}장 · 여러 장 선택 가능</small>
        <input type="file" accept="image/*" multiple onChange={add} disabled={total >= max} hidden />
      </label>
      {error && <p className="message error">{error}</p>}
      {total > 0 && <div className="photo-grid">
        {existing.map((url, index) => (
          <div className="photo-tile" key={url}>
            <img src={url} alt={"기존 사진 "+(index + 1)} />
            {index === 0 && <span className="photo-primary">대표</span>}
            <div className="photo-controls">
              {index > 0 && <button type="button" onClick={() => makeExistingFirst(index)}>대표로</button>}
              <button type="button" onClick={() => setExisting(prev => prev.filter((_, i) => i !== index))}>삭제</button>
            </div>
          </div>
        ))}
        {files.map((file, index) => <SelectedImage
          key={file.name + file.lastModified + '-' + index} file={file}
          first={existing.length === 0 && index === 0}
          onRemove={() => setFiles(prev => prev.filter((_, i) => i !== index))}
          onFirst={() => setFiles(prev => [prev[index], ...prev.filter((_, i) => i !== index)])}
        />)}
      </div>}
      <p className="small-note">첫 번째 사진이 대표 이미지입니다. 불필요한 사진은 삭제한 뒤 새 사진을 추가할 수 있어요.</p>
    </div>
  );
}
