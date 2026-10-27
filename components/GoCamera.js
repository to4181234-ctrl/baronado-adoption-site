'use client';
import { useEffect, useRef, useState } from 'react';
export default function GoCamera({ dog, onDone }) {
  const video = useRef(null);
  const stream = useRef(null);
  const mounted = useRef(true);
  const [active, setActive] = useState(false);
  const [original, setOriginal] = useState(null);
  const [preview, setPreview] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function stop() { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; setActive(false); }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; stream.current?.getTracks().forEach(track => track.stop()); }; }, []);
  useEffect(() => { if (!original) { setPreview(''); return; } const url = URL.createObjectURL(original); setPreview(url); return () => URL.revokeObjectURL(url); }, [original]);
  useEffect(() => { if (active && video.current && stream.current) { video.current.srcObject = stream.current; video.current.play().catch(() => {}); } }, [active]);
  async function start() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) return setError('카메라를 사용할 수 없어요. 브라우저의 카메라 권한을 확인해주세요.');
    try { const source = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } } }); if (!mounted.current) { source.getTracks().forEach(track => track.stop()); return; } stream.current = source; setActive(true); }
    catch { setError('카메라 권한이 필요해요. 브라우저 설정에서 허용해주세요.'); }
  }
  async function shoot() {
    if (busy) return;
    const node = video.current;
    if (!node?.videoWidth) return setError('카메라가 준비되면 다시 눌러주세요.');
    setBusy(true);
    try { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 768; const side = Math.min(node.videoWidth, node.videoHeight); canvas.getContext('2d').drawImage(node, (node.videoWidth-side)/2, (node.videoHeight-side)/2, side, side, 0, 0, 768, 768); const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .84)); if (!blob) throw new Error(); stop(); setOriginal(blob); }
    catch { setError('촬영하지 못했어요. 다시 시도해주세요.'); } finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setError('');
    try { const form = new FormData(); form.set('dogId', dog.id); form.set('title', title); form.set('description', description); form.set('photo', original, 'camera.webp'); const r = await fetch('/api/go/cards', { method: 'POST', body: form }); const result = await r.json(); if (!r.ok) throw new Error(result.error); onDone(); }
    catch (e) { setError(e.message || '저장하지 못했어요.'); } finally { setBusy(false); }
  }
  return <div className="go-camera"><h2>{dog.name} 촬영</h2>{!active && !original && <button className="go-primary" onClick={start}>카메라 열기</button>}{active && <div className="go-viewfinder"><video ref={video} autoPlay muted playsInline /><span className="go-frame" /><div className="go-camera-controls"><button className="go-camera-cancel" onClick={stop}>취소</button><button className="go-shutter" disabled={busy} onClick={shoot} aria-label="사진 촬영" /></div></div>}{original && <>{preview && <img className="go-capture-preview" src={preview} alt="촬영한 사진" />}<label className="go-description">게시물 제목<input maxLength={80} value={title} onChange={e => setTitle(e.target.value)} placeholder="오늘의 순간에 제목을 붙여주세요" /></label><label className="go-description">오늘의 기록 <span>{description.length}/200</span><textarea maxLength={200} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="이 멍멍이와 만난 순간을 남겨주세요" /></label><div className="go-camera-actions"><button disabled={busy} onClick={() => { setOriginal(null); start(); }}>다시 촬영</button><button className="go-primary" disabled={busy || !title.trim() || !description.trim()} onClick={save}>{busy ? '저장 중…' : '카드 저장'}</button></div><p className="go-note">내 도감에 먼저 저장되고, 관리자 승인 후 모두의 도감에 공개됩니다. 얼굴이나 차량번호가 보이면 다시 촬영해주세요.</p></>}{error && <p className="go-error" role="alert">{error}</p>}</div>;
}
