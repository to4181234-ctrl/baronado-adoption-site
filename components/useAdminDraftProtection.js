'use client';

import { useEffect } from 'react';

const MESSAGE = '저장하지 않은 변경사항이 있어요. 페이지를 나가시겠습니까?';

export default function useAdminDraftProtection(isDirty) {
  useEffect(() => {
    if (!isDirty) return;
    const beforeUnload = event => { event.preventDefault(); event.returnValue = ''; };
    const beforeLink = event => {
      const link = event.target.closest?.('a[href]');
      if (!link || link.getAttribute('href')?.startsWith('#')) return;
      if (!window.confirm(MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const guard = { ...window.history.state, baronadoDraftGuard: true };
    if (!window.history.state?.baronadoDraftGuard) window.history.pushState(guard, '', window.location.href);
    const onPopState = () => {
      if (window.confirm(MESSAGE)) {
        window.removeEventListener('popstate', onPopState);
        window.history.back();
      } else {
        window.history.pushState(guard, '', window.location.href);
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', beforeLink, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', beforeLink, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, [isDirty]);
}
