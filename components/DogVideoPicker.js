'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MAX_VIDEO_BYTES, VIDEO_TYPES } from '../lib/dogVideo';
import { videoFrameBounds } from '../lib/videoPoster';

function VideoTile({ item, index, onRemove, onPoster, onClearPoster }) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const src = useMemo(() => item.file ? URL.createObjectURL(item.file) : item.url, [item.file, item.url]);
  const poster = useMemo(() => item.posterFile ? URL.createObjectURL(item.posterFile) : item.posterUrl, [item.posterFile, item.posterUrl]);
  useEffect(() => () => { if (item.file) URL.revokeObjectURL(src); }, [item.file, src]);
  useEffect(() => () => { if (item.posterFile) URL.revokeObjectURL(poster); }, [item.posterFile, poster]);
  const capture = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) { setError('영상을 재생하거나 재생 막대를 움직여 장면을 먼저 선택해주세요.'); return; }
    setWorking(true);
    setError('');
    try {
      video.pause();
      const bounds = videoFrameBounds(video.videoWidth, video.videoHeight);
      if (!bounds) throw new Error('영상 화면을 읽을 수 없어요.');
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 640;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('이 기기에서 대표 화면을 만들 수 없어요.');
      context.fillStyle = '#211b18';
      context.fillRect(0, 0, 640, 640);
      context.drawImage(video, bounds.x, bounds.y, bounds.width, bounds.height);
      const blob = await new Promise((resolve, reject) => {
        try { canvas.toBlob(result => result ? resolve(result) : reject(new Error('대표 화면을 저장할 수 없어요.')), 'image/webp', .78); }
        catch (error) { reject(error); }
      });
      const type = blob.type === 'image/webp' ? 'image/webp' : 'image/png';
      onPoster(new File([blob], `video-poster.${type === 'image/webp' ? 'webp' : 'png'}`, { type }));
    } catch {
      setError('이 영상의 장면을 추출하지 못했습니다. 새 동영상 파일로 등록한 뒤 다시 선택해주세요.');
    } finally { setWorking(false); }
  };
  return <div className="video-tile">
    <video ref={videoRef} crossOrigin="anonymous" controls preload="metadata" playsInline src={src} aria-label={`${index + 1}번째 동영상`} />
    <p className="small-note">영상의 재생 막대를 움직여 원하는 장면에서 멈춘 뒤 표지로 저장하세요.</p>
    <button type="button" className="btn secondary" disabled={working} onClick={capture}>{working ? '대표 화면 만드는 중...' : '현재 장면을 대표 화면으로 저장'}</button>
    {poster && <div className="video-poster-preview"><img src={poster} alt={`${index + 1}번째 동영상 대표 화면`} /><button type="button" onClick={onClearPoster}>대표 화면 삭제</button></div>}
    {error && <p className="message error" role="alert">{error}</p>}
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
      {items.map((item, index) => <VideoTile key={item.id} item={item} index={index}
        onPoster={file => setItems(prev => prev.map(video => video.id === item.id ? { ...video, posterFile: file, posterUrl: '' } : video))}
        onClearPoster={() => setItems(prev => prev.map(video => video.id === item.id ? { ...video, posterFile: null, posterUrl: '' } : video))}
        onRemove={() => setItems(prev => prev.filter(video => video.id !== item.id))} />)}
      {items.length < 2 && <label className="video-add">+ 동영상 추가
        <input type="file" accept="video/mp4,video/webm,video/quicktime,.mov" multiple onChange={add} hidden />
      </label>}
    </div>
    {error && <p className="message error">{error}</p>}
    <p className="small-note">사진은 그대로 유지되며 동영상은 최대 2개, 파일당 30MB까지 등록할 수 있어요. 모바일에서도 잘 재생되도록 MP4를 권장합니다. 게시글을 저장하면 업로드됩니다.</p>
  </section>;
}
