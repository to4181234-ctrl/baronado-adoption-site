// Pure rules shared by the individual album's select/delete flow.
// Selection IDs are intentionally independent of sorting and the visible page.
export const ALBUM_PAGE_SIZE = 4;
export const ALBUM_SELECTION_LIMIT = 50;

export function toggleAlbumSelection(ids, id, limit = ALBUM_SELECTION_LIMIT) {
  if (!Array.isArray(ids) || typeof id !== 'string' || !id) throw new Error('카드 선택값을 확인해주세요.');
  if (ids.includes(id)) return ids.filter(value => value !== id);
  return ids.length >= limit ? ids : [...ids, id];
}

export function lastAlbumPage(total, pageSize = ALBUM_PAGE_SIZE) {
  return Math.max(0, Math.ceil(Math.max(0, Number(total) || 0) / pageSize) - 1);
}

export function albumRankPercent(rank, participants) {
  return Number.isFinite(rank) && Number.isFinite(participants) && rank > 0 && participants > 0
    ? Math.ceil(rank / participants * 100) : null;
}
