// Shared, side-effect-free rules for MeongGO stage-one currency.
export const GO_CARE_REWARD_COINS = 10;
export const GO_CARE_REWARD_DAILY_LIMIT = 5;
export const GO_CARE_QUEST_COINS = 10;
export const GO_VISIT_QUEST_COINS = 30;
export const GO_COIN_HISTORY_PAGE_SIZE = 10;

export function koreaDay(value = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new RangeError('Invalid date');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

export function parseCoinHistoryQuery(searchParams) {
  const filter = searchParams.get('filter') || 'all';
  const rawOffset = searchParams.get('offset') || '0';
  if (!['all', 'earn', 'spend'].includes(filter) || !/^(0|[1-9][0-9]*)$/.test(rawOffset)) {
    throw new RangeError('Invalid coin history query');
  }
  const offset = Number(rawOffset);
  if (!Number.isSafeInteger(offset) || offset > 10000) throw new RangeError('Invalid coin history offset');
  return { filter, offset, limit: GO_COIN_HISTORY_PAGE_SIZE };
}

export function coinHistoryCategory(delta) {
  return Number(delta) > 0 ? 'earn' : 'spend';
}
