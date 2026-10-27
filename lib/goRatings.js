export const RATING_TRAITS = [
  { key: 'cuteness', label: '귀여움' },
  { key: 'charm', label: '매력' },
  { key: 'affection', label: '애교' }
];

export const EMPTY_RATINGS = { cuteness: null, charm: null, affection: null };

export function validateRatings(value = EMPTY_RATINGS) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !RATING_TRAITS.some(trait => trait.key === key))) {
    throw new Error('별점 항목을 확인해주세요.');
  }
  return Object.fromEntries(RATING_TRAITS.map(({ key }) => {
    const score = value[key] ?? null;
    if (score !== null && (!Number.isInteger(score) || score < 1 || score > 5)) throw new Error('별점은 1~5개 중에서 선택해주세요.');
    return [key, score];
  }));
}
