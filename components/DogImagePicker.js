'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { clampPosition, cropSource } from '../lib/squareCrop';

function SquareCrop({ file, url, onApply, onCancel }) {
  const [src, setSrc] = useState('');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [frameSize, setFrameSize] = useState(300);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const frameRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = file ? URL.createObjectURL(file) : null;
    setSrc(objectUrl || '');
    setDimensions({ width: 0, height: 0 });
    setPosition({ x: 0, y: 0 });
    setZoom(1);
    setError('');
    if (url && !file) {
      fetch('/api/admin/photo', {
        method: 'POST', credentials: 'same-origin', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url })
      }).then(async response => {
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || '기존 사진을 불러오지 못했습니다.');
        }
        return response.blob();
      }).catch(async () => {
        const response = await fetch(url, { signal: controller.signal, mode: 'cors' });
        if (!response.ok) throw new Error('사진을 불러오지 못했습니다.');
        return response.blob();
      }).then(blob => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      }).catch(() => { if (!controller.signal.aborted) setError('기존 사진 원본을 불러오지 못했습니다. 취소한 뒤 ‘수정 → 다른 사진으로 교체’를 이용해주세요.'); });
    }
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file, url]);

  useEffect(() => {
    if (!frameRef.current) return;
    const observer = new ResizeObserver(([entry]) => setFrameSize(entry.contentRect.width));
    observer.observe(frameRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = event => { if (event.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onCancel]);

  const scale = dimensions.width && dimensions.height
    ? Math.max(frameSize / dimensions.width, frameSize / dimensions.height) * zoom : 1;

  const onPointerDown = event => {
    if (!dimensions.width) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, position };
  };
  const onPointerMove = event => {
    if (!dragRef.current) return;
    setPosition(clampPosition({
      x: dragRef.current.position.x + event.clientX - dragRef.current.x,
      y: dragRef.current.position.y + event.clientY - dragRef.current.y
    }, dimensions, frameSize, zoom));
  };
  const save = async () => {
    const image = imageRef.current;
    if (!image?.naturalWidth || !dimensions.width) return;
    setBusy(true);
    setError('');
    try {
      const { x, y, size: cropSize } = cropSource(dimensions, frameSize, zoom, position);
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1200;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('이 브라우저에서는 사진을 자를 수 없습니다.');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, 1200, 1200);
      context.drawImage(image, x, y, cropSize, cropSize, 0, 0, 1200, 1200);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88));
      if (!blob || blob.size > 10 * 1024 * 1024) throw new Error('사진을 저장할 수 없습니다. 다른 사진으로 다시 시도해주세요.');
      onApply(new File([blob], `${(file?.name || 'existing-photo').replace(/\.[^.]+$/, '')}-square.jpg`, { type: 'image/jpeg' }));
    } catch (cause) {
      setError(cause.name === 'SecurityError' ? '원본 사진 접근이 제한되어 있습니다. 원본 파일을 다시 업로드해주세요.' : cause.message || '사진을 자르지 못했습니다.');
      setBusy(false);
    }
  };

  return <div className="image-modal crop-backdrop" onClick={() => { if (!busy) onCancel(); }}>
    <div className="crop-dialog" role="dialog" aria-modal="true" aria-label="사진 1:1 자르기" onClick={event => event.stopPropagation()}>
      <h2>사진 1:1 자르기</h2>
      <p className="small-note">사진을 드래그해 위치를 옮기고, 아래에서 크기를 조절하세요.</p>
      <div className="crop-frame" ref={frameRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
        {!dimensions.width && url && !file && <img className="crop-source-preview" src={url} alt="기존 사진 미리보기" />}
        {!dimensions.width && !error && <span className="crop-loading">사진을 불러오는 중...</span>}
        {src && <img ref={imageRef} crossOrigin="anonymous" src={src} alt="자르기 미리보기" draggable="false"
          onLoad={event => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
          onError={() => setError('이 사진을 열 수 없습니다. 원본 파일을 다시 업로드해주세요.')}
          style={dimensions.width ? { width: dimensions.width * scale, height: dimensions.height * scale, left: `calc(50% + ${position.x}px)`, top: `calc(50% + ${position.y}px)` } : { opacity: 0 }} />}
      </div>
      <label className="crop-zoom"><span>확대</span><input type="range" min="1" max="3" step="0.01" value={zoom} aria-label="사진 확대" onChange={event => {
        const next = Number(event.target.value);
        setZoom(next);
        setPosition(current => clampPosition(current, dimensions, frameSize, next));
      }} /><span>{Math.round(zoom * 100)}%</span></label>
      {error && <p className="message error">{error}</p>}
      <div className="crop-actions"><button type="button" className="btn secondary" onClick={onCancel} disabled={busy}>이 사진 취소</button><button type="button" className="btn" onClick={save} disabled={busy || !dimensions.width}>{busy ? '사진 준비 중...' : '자르기 완료'}</button></div>
    </div>
  </div>;
}

function NewPhoto({ file, onRemove, isPrimary }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <div className="photo-tile">
    <img src={url} alt={file.name} />
    {isPrimary && <span className="photo-primary">대표</span>}
    <button className="photo-delete" type="button" onClick={onRemove}>삭제</button>
  </div>;
}

export default function DogImagePicker({ existing = [], files, setFiles, setExisting, replacements = {}, setReplacements, max = 3 }) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState([]);
  const [editingUrl, setEditingUrl] = useState('');
  const total = existing.length + files.length;
  const queueFile = (event, replaceUrl = '') => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) {
      setError('JPG, PNG, WEBP, GIF, AVIF 이미지만 파일당 10MB 이하로 선택할 수 있습니다.');
      return;
    }
    if (!replaceUrl && total + pending.length >= max) return;
    setError('');
    setEditingUrl('');
    setPending(prev => [...prev, { id: crypto.randomUUID(), file, url: replaceUrl }]);
  };
  return <div className="image-picker">
    {error && <p className="message error">{error}</p>}
    <div className="photo-grid" aria-label="사진 등록 (최대 3장)">
      {Array.from({ length: max }, (_, index) => {
        const url = existing[index];
        const file = files[index - existing.length];
        if (url) return <div className="photo-tile" key={url}>
        <PhotoPreview file={replacements[url]} url={url} alt={'기존 사진 '+(index+1)}/>
        {index === 0 && <span className="photo-primary">대표</span>}
        {setReplacements && <button className="photo-recrop" type="button" onClick={() => setEditingUrl(url)}>수정</button>}
        <button className="photo-delete" type="button" onClick={() => { setExisting(prev => prev.filter(item => item !== url)); setReplacements?.(prev => { const next = { ...prev }; delete next[url]; return next; }); }}>삭제</button>
        </div>;
        if (file) return <NewPhoto key={file.name+file.lastModified+'-'+index} file={file} isPrimary={index===0} onRemove={() => setFiles(prev=>prev.filter((_,i)=>i!==index-existing.length))}/>;
        return <label className="photo-tile photo-empty" key={'empty-'+index}>
          <strong>+ 사진 추가</strong>
          <input type="file" accept="image/*" onChange={queueFile} disabled={total + pending.length >= max} hidden />
        </label>;
      })}
    </div>
    <p className="small-note">첫 번째 사진이 대표 이미지입니다. 사진은 등록 전에 1:1 정사각형으로 자릅니다. 수정한 사진은 게시글을 저장하면 반영됩니다.</p>
    {editingUrl && <div className="image-modal photo-edit-backdrop" onClick={() => setEditingUrl('')}>
      <div className="photo-edit-dialog" role="dialog" aria-modal="true" aria-label="사진 수정" onClick={event => event.stopPropagation()}>
        <h2>사진 수정</h2>
        <button className="btn secondary" type="button" onClick={() => { setPending(prev => [...prev, { id: crypto.randomUUID(), url: editingUrl }]); setEditingUrl(''); }}>현재 사진 다시 자르기</button>
        <label className="btn photo-replace-pick">다른 사진으로 교체<input type="file" accept="image/*" onChange={event => queueFile(event, editingUrl)} hidden /></label>
        <button className="photo-edit-cancel" type="button" onClick={() => setEditingUrl('')}>취소</button>
      </div>
    </div>}
    {pending[0] && <SquareCrop key={pending[0].id} file={pending[0].file} url={pending[0].url}
      onApply={cropped => { if (pending[0].url) setReplacements(prev => ({ ...prev, [pending[0].url]: cropped })); else setFiles(prev => [...prev, cropped]); setPending(prev => prev.slice(1)); }}
      onCancel={() => setPending(prev => prev.slice(1))} />}
  </div>;
}

function PhotoPreview({ file, url, alt }) {
  const preview = useMemo(() => file ? URL.createObjectURL(file) : url, [file, url]);
  useEffect(() => () => { if (file) URL.revokeObjectURL(preview); }, [file, preview]);
  return <img src={preview} alt={alt}/>;
}
