// Stage-one visit verification input rules; the server controls request time.
export const VISIT_REJECTION_REASONS = Object.freeze({
  no_purchase: '음료 구매 내역을 확인할 수 없어요.',
  not_present: '현장 방문을 확인할 수 없어요.',
  unverifiable: '인증 정보를 확인할 수 없어요.'
});
export function normalizeVisitCode(input) {
  const code = typeof input === 'string' ? input.trim() : '';
  return /^[0-9]{6}$/.test(code) ? code : null;
}
export function isVisitRequestWindow(date = new Date()) {
  const time = new Date(date);
  if (!Number.isFinite(time.getTime())) return false;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul', hourCycle: 'h23', hour: '2-digit', minute: '2-digit'
  }).formatToParts(time);
  const hour = Number(parts.find(p => p.type === 'hour')?.value);
  return hour >= 9 && hour < 21;
}
export function validVisitDecision(action, reason) {
  return action === 'approve' ||
    action === 'reject' && Object.hasOwn(VISIT_REJECTION_REASONS, reason);
}
