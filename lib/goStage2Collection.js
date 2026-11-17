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
  // Existing go_official_owned is unique per member/dog/slot. Repeated draw
  // replaces or keeps a rating; it must not count as a second owned card.
  const ownedNumbers = new Set(officialCards.map(card => officialCardNumber(card?.slot ?? card?.number)).filter(Boolean));
  const normalKinds = new Set([...ownedNumbers].filter(number => number <= OFFICIAL_NORMAL_COUNT));
  const hiddenOwned = ownedNumbers.has(OFFICIAL_HIDDEN_NUMBER);
  return {
    officialCount: ownedNumbers.size,
    customCount,
    totalCount: ownedNumbers.size + customCount,
    collectedNormalKinds: normalKinds.size,
    hiddenOwned,
    hiddenUnlockable: normalKinds.size === OFFICIAL_NORMAL_COUNT && !hiddenOwned,
    complete: normalKinds.size === OFFICIAL_NORMAL_COUNT && hiddenOwned,
  };
}
