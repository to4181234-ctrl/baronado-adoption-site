// In-memory reward notice queue shared across MeongGO SPA navigation.
// This module is client-safe and does not store account information.
const listeners = new Set();
const queue = [];
let active = null;
let timer = null;
function emit() {
  for (const listener of listeners) listener(active);
}
function next() {
  if (timer) clearTimeout(timer);
  timer = null;
  active = queue.shift() || null;
  emit();
  if (active && typeof window !== 'undefined') timer = window.setTimeout(next, 1500);
}
export function enqueueGoCoinNotice(amount) {
  if (!Number.isSafeInteger(amount) || amount === 0) return false;
  queue.push({ id: Date.now() + ':' + queue.length, amount });
  if (!active) next();
  return true;
}
export function subscribeGoCoinNotices(listener) {
  listeners.add(listener);
  listener(active);
  return () => listeners.delete(listener);
}
export function clearGoCoinNotices() {
  queue.length = 0;
  if (timer) clearTimeout(timer);
  timer = null;
  active = null;
  emit();
}
