// Browser-generated random ID stays in this browser. The server stores only
// a keyed hash, never the original ID, IP address, or contact information.
let fallbackId = '';

function visitorId() {
  if (fallbackId) return fallbackId;
  if (typeof window === 'undefined') return '';
  try {
    const stored = window.localStorage.getItem('baronado_analytics_visitor_v1');
    if (stored && /^[0-9a-f-]{32,36}$/i.test(stored)) {
      fallbackId = stored;
      return stored;
    }
  } catch { /* Private browsing may block local storage. */ }

  try {
    const generated = typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : Array.from(window.crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    fallbackId = generated;
    try { window.localStorage.setItem('baronado_analytics_visitor_v1', generated); } catch {}
    return generated;
  } catch {
    return '';
  }
}

export function recordVisit(page, dogId) {
  recordAnalyticsEvent('page_view', page, dogId);
}

export function recordShareClick(page, dogId) {
  recordAnalyticsEvent('share_click', page, dogId);
}

export function recordInquiryClick(page, dogId) {
  recordAnalyticsEvent('inquiry_click', page, dogId);
}

function recordAnalyticsEvent(eventType, page, dogId) {
  if (typeof window === 'undefined') return;
  const id = visitorId();
  if (!id) return;
  // No tracking on administration routes; failures never interfere with the site.
  if (window.location.pathname.startsWith('/admin')) return;
  try {
    fetch('/api/analytics/track', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, page, dogId: dogId || null, visitorId: id })
    }).catch(() => {});
  } catch { /* Analytics must never break navigation or sharing. */ }
}
