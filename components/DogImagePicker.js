'use client';

import { useEffect, useMemo, useState } from 'react';

function NewPhoto({ file, onRemove, isPrimary }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <div className="photo-tile">
    <img src={url} alt={file.name} />
    {isPrimary && <span className="photo-primary">대표</span>}
    <button className="photo-delete" type="button" onClick={onRemove}>삭제</button>
  </div>;
}

export default function DogImagePicker({ existing = [], files, setFiles, setExisting, max = 3 }) {
  const [error, setError] = useState('');
  const total = existing.length + files.length;
  const add = (event) => {
    const selection = Array.from(event.target.files || []);
    const eligible = selection.filter(file => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024);
    const room = max - total;
    setError(eligible.length < selection.length ? '이미지는 파일당 10MB 이하만 업로드할 수 있습니다.' : selection.length > room ? '사진은 최대 3장까지 등록할 수 있습니다.' : '');
    setFiles(prev => [...prev, ...eligible.slice(0, Math.max(room, 0))]);
    event.target.value = '';
  };
  return <div className="image-picker">
    <label className="upload-pick">
      <strong>+ 사진 추가</strong><small>{total}/{max}장 · 여러 장 선택 가능</small>
      <input type="file" accept="image/*" multiple onChange={add} disabled={total >= max} hidden/>
    </label>
    {error && <p className="message error">{error}</p>}
    {total > 0 && <div className="photo-grid">
      {existing.map((url, index) => <div className="photo-tile" key={url}>
        <img src={url} alt={'기존 사진 '+(index+1)}/>
        {index === 0 && <span className="photo-primary">대표</span>}
        <button className="photo-delete" type="button" onClick={() => setExisting(prev => prev.filter((_,i) => i !== index))}>삭제</button>
      </div>)}
      {files.map((file,index) => <NewPhoto key={file.name+file.lastModified+'-'+index} file={file} isPrimary={existing.length===0&&index===0} onRemove={() => setFiles(prev=>prev.filter((_,i)=>i!==index))}/>)}
    </div>}
    <p className="small-note">첫 사진이 대표 이미지입니다. 대표 사진을 바꾸려면 앞선 사진을 삭제하고 원하는 사진을 먼저 추가하세요.</p>
  </div>;
}
