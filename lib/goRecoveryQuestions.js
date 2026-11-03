export const RECOVERY_QUESTIONS = Object.freeze([
  '나만 알고 있는 특별한 장소의 별명은?',
  '내가 기억하는 소중한 물건의 별명은?',
  '나만 기억하는 어릴 적 별명은?',
  '내가 정한 비밀 단어를 떠올리게 하는 질문은?',
  '기억에 남는 나만의 여행지 별명은?'
]);

export function recoveryQuestion(value) {
  if (typeof value !== 'string' || !RECOVERY_QUESTIONS.includes(value)) {
    throw new Error('본인 확인 질문을 선택해주세요.');
  }
  return value;
}

export function recoveryAnswer(value) {
  if (typeof value !== 'string') throw new Error('본인 확인 답변을 입력해주세요.');
  const answer = value.trim().normalize('NFKC').toLocaleLowerCase('ko-KR');
  if (answer.length < 2 || answer.length > 80) {
    throw new Error('본인 확인 답변은 2~80자로 입력해주세요.');
  }
  return answer;
}
