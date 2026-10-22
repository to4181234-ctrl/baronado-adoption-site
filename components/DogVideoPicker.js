'use client';

import { useEffect, useMemo, useState } from 'react';
import { MAX_VIDEO_BYTES, VIDEO_TYPES } from '../lib/dogVideo';

function VideoTile({ item, index, onRemove }) {
  const src = useMemo(() => item.file ? URL.createObjectURL(item.file) : item.url, [item.file, item.url]);
  useEffect(() => () => { if (item.file) URL.revokeObjectURL(src); }, [item.file, src]);
  return <div className="video-tile">
    <video controls preload="metadata" playsInline src={src} aria-label={`${index + 1}번째 동영상`} />
    <button type="button" className="btn secondary" onClick={onRemove}>동영상 삭제</button>
  </div>;
}

export default function DogVideoPicker({ items, setItems }) {
  const [error, setError] = useState('');
  const add = event => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (items.length + files.length > 2) { setError('동영상은 2개까지 등록할 수 있어요.'); return; }
    if (files.some(file => !VIDEO_TYPES[file.type] || file.size <= 0 || file.size > MAX_VIDEO_BYTES)) {
      setError('MP4, WebM, MOV 동영상만 파일당 30MB 이하로 선택할 수 있어요.'); return;
    }
    setError('');
    setItems(prev => [...prev, ...files.map(file => ({ id: crypto.randomUUID(), file }))]);
  };
  return <section className="video-picker" aria-label="동영상 등록">
    <h2 className="label">동영상</h2>
    <div className="video-tiles">
      {items.map((item, index) => <VideoTile key={item.id} item={item} index={index} onRemove={() => setItems(prev => prev.filter(video => video.id !== item.id))} />)}
      {items.length < 2 && <label className="video-add">+ 동영상 추가
        <input type="file" accept="video/mp4,video/webm,video/quicktime,.mov" multiple onChange={add} hidden />
      </label>}
    </div>
    {error && <p className="message error">{error}</p>}
    <p className="small-note">사진은 그대로 유지되며 동영상은 최대 2개, 파일당 30MB까지 등록할 수 있어요. 모바일에서도 잘 재생되도록 MP4를 권장합니다. 게시글을 저장하면 업로드됩니다.</p>
  </section>;
}
