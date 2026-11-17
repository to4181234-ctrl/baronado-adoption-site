// Stage 2 pure collection rules; no database calls or implicit grants.
// The existing go_cards records represent member-created photographs.
// Official cards must be loaded from a separate, verified ownership source.
export const OFFICIAL_NORMAL_COUNT = 4;
export const OFFICIAL_HIDDEN_NUMBER = 5;

export function officialCardNumber(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= OFFICIAL_HIDDEN_NUMBER ? n : null;
}

export function summarizeDogCards(officialCards = [], customCount = 0) {
  if (!Array.isArray(officialCards)) throw new TypeError('officialCards must be an array');
  if (!Number.isSafeInteger(customCount) || customCount < 0) {
    throw new RangeError('customCount must be a nonnegative integer');
  }
  // Accept multiple owned copies of the same official number, e.g. after
  // a store duplicate decision. Do not mistake copies for distinct designs.
  const owned = officialCards.filter(card => officialCardNumber(card?.number) !== null);
  const normalKinds = new Set(owned.map(card => officialCardNumber(card.number))
    .filter(number => number <= OFFICIAL_NORMAL_COUNT));
  const hiddenOwned = owned.some(card => officialCardNumber(card.number) === OFFICIAL_HIDDEN_NUMBER);
  return {
    officialCount: owned.length,
    customCount,
    totalCount: owned.length + customCount,
    collectedNormalKinds: normalKinds.size,
    hiddenOwned,
    hiddenUnlockable: normalKinds.size === OFFICIAL_NORMAL_COUNT && !hiddenOwned,
    complete: normalKinds.size === OFFICIAL_NORMAL_COUNT && hiddenOwned,
  };
}
