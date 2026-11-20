// Pure rules shared by the individual album's select/delete flow.
// Selection IDs are intentionally independent of sorting and the visible page.
export const ALBUM_PAGE_SIZE = 4;
export const ALBUM_SELECTION_LIMIT = 50;

export function toggleAlbumSelection(ids, id, limit = ALBUM_SELECTION_LIMIT) {
  if (!Array.isArray(ids) || typeof id !== 'string' || !id) throw new Error('카드 선택값을 확인해주세요.');
  if (ids.includes(id)) return ids.filter(value => value !== id);
  return ids.length >= limit ? ids : [...ids, id];
}


/**
 * Figma 586:163478: a fresh, empty selection mode stays open, but removing
 * the final previously selected card immediately closes that mode.
 * IDs survive pagination. Sorting is handled by the caller.
 */
export function changeAlbumSelection(previousIds, cardId, limit = ALBUM_SELECTION_LIMIT) {
  const selectedIds = toggleAlbumSelection(previousIds, cardId, limit);
  return {
    selectedIds,
    selectionMode: !(previousIds.length > 0 && selectedIds.length === 0),
  };
}

export function lastAlbumPage(total, pageSize = ALBUM_PAGE_SIZE) {
  return Math.max(0, Math.ceil(Math.max(0, Number(total) || 0) / pageSize) - 1);
}

export function albumRankPercent(rank, participants) {
  return Number.isFinite(rank) && Number.isFinite(participants) && rank > 0 && participants > 0
    ? Math.ceil(rank / participants * 100) : null;
}

/** User-facing rank label. With fewer than 10 participants, percentages
 * exaggerate small differences; show shared rank and participant count. */
export function albumRankLabel(standing){
 const n=Number(standing?.participants),rank=Number(standing?.rank);
 if(!Number.isInteger(rank)||rank<1||!Number.isInteger(n)||n<1)return null;
 if(n<10||standing.percentile==null)
  return `${Number(standing.ties)>1?'공동 ':''}${rank}위 · 참여자 ${n}명`;
 return `상위 ${standing.percentile}%`;
}

/** Pure combined leaderboard scoring. The API already fetched approved personal
 * cards plus owned official and HIDDEN rows. Duplicates are per-owned-card rows.
 */
export function combinedAlbumRank(memberId,members,personal,official,hidden){
 const active=new Set(members.map(row=>row.id));
 const scores=new Map();
 for(const row of [...personal,...official,...hidden]){
  if(!active.has(row.member_id))continue;
  scores.set(row.member_id,(scores.get(row.member_id)||0)+1);
 }
 const collected=scores.get(memberId)||0,participants=scores.size;
 if(!collected)return {collected,participants,rank:null,ties:0,percentile:null};
 const vals=[...scores.values()];
 const higher=vals.filter(n=>n>collected).length;
 const ties=vals.filter(n=>n===collected).length;
 return {collected,participants,rank:higher+1,ties,
  percentile:participants>=10?Math.ceil((higher+ties)/participants*100):null};
}
