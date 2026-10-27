'use client';

import { useEffect, useRef, useState } from 'react';

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('촬영에 실패했어요.')), type, quality));
}

export default function GoCamera({ dog, onDone }) {
  const video = useRef(null);
  const stream = useRef(null);
  const [active, setActive] = useState(false);
  const [original, setOriginal] = useState(null);
  const [cutout, setCutout] = useState(null);
  const [selected, setSelected] = useState('original');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  function stopCamera() { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; setActive(false); }
  useEffect(() => () => { stream.current?.getTracks().forEach(track => track.stop()); }, []);
  useEffect(() => {
    const blob = selected === 'cutout' ? cutout : original;
    if (!blob) { setPreviewUrl(''); return; }
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [original, cutout, selected]);
  useEffect(() => {
    if (active && video.current && stream.current) {
      video.current.srcObject = stream.current;
      video.current.play().catch(() => {});
    }
  }, [active]);

  async function start() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) return setError('이 브라우저에서 카메라를 사용할 수 없어요. HTTPS 연결과 카메라 권한을 확인해주세요.');
    try {
      const source = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } } });
      stream.current = source; setActive(true);
    } catch { setError('카메라 권한이 필요해요. 브라우저 설정에서 허용해주세요.'); }
  }

  async function shoot() {
    const node = video.current;
    if (!node?.videoWidth) return setError('카메라가 준비되면 다시 눌러주세요.');
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = 768;
    const side = Math.min(node.videoWidth, node.videoHeight);
    canvas.getContext('2d').drawImage(node, (node.videoWidth - side) / 2, (node.videoHeight - side) / 2, side, side, 0, 0, 768, 768);
    const blob = await canvasBlob(canvas, 'image/webp', .84);
    stopCamera(); setOriginal(blob); setCutout(null); setSelected('original');
  }

  async function makeCutout() {
    if (!original) return;
    setBusy(true); setError('');
    try {
      const { removeDogBackground } = await import('../lib/goCutout.js');
      const result = await removeDogBackground(original);
      setCutout(result); setSelected('cutout');
    } catch { setError('이 기기에서 자동 누끼를 완료하지 못했어요. 원본 사진으로 계속할 수 있어요.'); }
    finally { setBusy(false); }
  }

  async function save() {
    setBusy(true); setError('');
    try {
      const form = new FormData();
      form.set('dogId', dog.id);
      form.set('style', selected);
      form.set('description', description);
      const blob = selected === 'cutout' ? cutout : original;
      form.set('photo', blob, selected === 'cutout' ? 'camera.png' : 'camera.webp');
      const response = await fetch('/api/go/cards', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '저장에 실패했어요.');
      setOriginal(null); setCutout(null); setDescription('');
      onDone();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <div className="go-camera"><h2>{dog.name}의 새 기록</h2>
    {!active && !original && <button type="button" className="go-primary" onClick={start}>📷 현장에서 카메라 열기</button>}
    {active && <div className="go-viewfinder"><video ref={video} autoPlay muted playsInline /><span className="go-frame" /><div><button className="go-shutter" onClick={shoot} aria-label="사진 촬영"/><button onClick={stopCamera}>취소</button></div></div>}
    {original && <><p className="go-note">앨범에서 가져오지 않은 방금 촬영한 사진이에요. 정사각형 카드로 저장됩니다.</p>
      <div className="go-style-switch"><button className={selected === 'original' ? 'active' : ''} onClick={() => setSelected('original')}>원본 사진</button><button className={selected === 'cutout' ? 'active' : ''} onClick={() => cutout ? setSelected('cutout') : makeCutout()} disabled={busy}>{busy ? '누끼 만드는 중…' : cutout ? '자동 누끼' : '자동 누끼 만들기'}</button></div>
      {previewUrl && <img className={`go-capture-preview ${selected === 'cutout' ? 'go-card-cutout' : ''}`} src={previewUrl} alt="촬영한 카드 미리보기" />}
      <label className="go-description">오늘의 기록 <span>{description.length}/200</span><textarea required maxLength={200} rows={3} value={description} onChange={event => setDescription(event.target.value)} placeholder="이 친구와 만난 순간을 남겨주세요" /></label>
      <div className="go-camera-actions"><button onClick={() => { setOriginal(null); setCutout(null); start(); }} disabled={busy}>다시 촬영</button><button className="go-primary" onClick={save} disabled={busy || !description.trim()}>{busy ? '저장 중…' : '내 도감에 기록'}</button></div>
      <p className="go-note">기록은 먼저 내 도감에 보이고, 관리자 확인 후 모두의 카드에 공개돼요. 사람 얼굴이나 차량번호가 찍혔다면 다시 촬영해주세요.</p>
    </>}
    {error && <p className="go-error" role="alert">{error}</p>}
  </div>;
}
