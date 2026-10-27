export const REJECTION_REASONS = {
  no_dog: '멍멍이가 보이지 않아요',
  wrong_dog: '선택한 멍멍이와 사진이 달라요',
  privacy: '사람 얼굴·개인정보가 보여요',
  quality: '사진이 너무 어둡거나 흐려요',
  inappropriate: '공개하기 어려운 내용이에요',
  other: '기타'
};

export function koreaMonth(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' }).formatToParts(value);
  return parts.find(part => part.type === 'year').value + '-' + parts.find(part => part.type === 'month').value;
}

export function monthDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error('월을 선택해주세요.');
  return value + '-01';
}

export function cardDate(value) {
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

export function rejectionText(card) {
  return card.rejectionReason === 'other' ? card.rejectionNote : REJECTION_REASONS[card.rejectionReason] || '관리자 확인이 필요한 사진이에요.';
}
