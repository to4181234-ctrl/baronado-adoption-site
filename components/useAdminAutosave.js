'use client';

import { useEffect, useRef, useState } from 'react';
import { adminDraftKey, createAdminDraft, parseAdminDraft } from '../lib/adminDraft';

export default function useAdminAutosave({ scope, form, photos, videos, baseline, dirty, setForm, setPhotos, setVideos }) {
  const [pending, setPending] = useState(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('');
  const latest = useRef(null);
  const finished = useRef(false);
  const key = adminDraftKey(scope);

  useEffect(() => {
    if (!form || !baseline) return;
    try {
      const saved = parseAdminDraft(window.localStorage.getItem(key));
      if (saved) setPending(saved);
      else setReady(true);
    } catch { setReady(true); setStatus('이 브라우저에서 임시 저장을 사용할 수 없어요.'); }
  }, [key, Boolean(form), Boolean(baseline)]);

  latest.current = ready && dirty && !finished.current ? createAdminDraft(form, photos, videos) : null;
  useEffect(() => {
    if (!ready || dirty || finished.current) return;
    try { window.localStorage.removeItem(key); } catch { /* Storage unavailable. */ }
  }, [key, ready, dirty]);
  useEffect(() => {
    if (!latest.current) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(latest.current));
        setStatus('이 브라우저에 자동 임시 저장됨');
      } catch { setStatus('임시 저장 공간이 부족하거나 사용할 수 없어요.'); }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [key, ready, dirty, form, photos, videos]);

  useEffect(() => () => {
    if (latest.current && !finished.current) {
      try { window.localStorage.setItem(key, JSON.stringify(latest.current)); } catch { /* Storage may be full. */ }
    }
  }, [key]);

  const restore = () => {
    if (!pending) return;
    setForm(pending.form);
    setPhotos(pending.photos);
    setVideos(pending.videos);
    setStatus('임시 저장 내용을 불러왔어요.');
    setPending(null);
    setReady(true);
  };
  const discard = () => {
    try { window.localStorage.removeItem(key); } catch { /* Storage unavailable. */ }
    setPending(null);
    setReady(true);
    setStatus('');
  };
  const clear = () => {
    finished.current = true;
    latest.current = null;
    try { window.localStorage.removeItem(key); } catch { /* Storage unavailable. */ }
    setStatus('');
  };
  return { ready, pending, status, restore, discard, clear };
}
