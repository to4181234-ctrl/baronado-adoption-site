export const PROFILE_FIELDS = [
  { key: 'breed', label: '견종' },
  { key: 'vaccinations', label: '접종 여부' },
  { key: 'toilet', label: '배변 여부' },
  { key: 'personality', label: '성격' },
  { key: 'likes', label: '좋아하는 것' },
  { key: 'dislikes', label: '싫어하는 것' },
  { key: 'charm', label: '애교 포인트' },
  { key: 'history', label: '히스토리' },
  { key: 'recommended_home', label: '추천 가구' },
  { key: 'ideal_family', label: '이 아이에게 필요한 가족' }
];

export function proofreadKorean(value) {
  return String(value || '')
    .replace(/친구에요/g, '친구예요')
    .replace(/아이에요/g, '아이예요')
    .replace(/친구애요/g, '친구예요')
    .replace(/되요/g, '돼요')
    .replace(/것을/g, '것을')
    .replace(/받는것/g, '받는 것')
    .replace(/있는것/g, '있는 것')
    .replace(/가는것/g, '가는 것')
    .replace(/입원때문에/g, '입원 때문에')
    .replace(/어쩔수없이/g, '어쩔 수 없이')
    .replace(/광견병접종/g, '광견병 접종')
    .replace(/많은친구/g, '많은 친구')
    .replace(/적응하고나면/g, '적응하고 나면')
    .replace(/처음가는것/g, '처음 가는 것')
    .replace(/이뻐/g, '예뻐')
    .replace(/쇼파/g, '소파')
    .replace(/할수/g, '할 수')
    .replace(/줄수/g, '줄 수')
    .replace(/있는분/g, '있는 분')
    .replace(/드려요/g, '드려요')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

const headingMap = {
  '견종': 'breed',
  '접종 여부': 'vaccinations',
  '배변 여부': 'toilet',
  '성격': 'personality',
  '좋아하는 것': 'likes',
  '싫어하는 것': 'dislikes',
  '애교 포인트': 'charm',
  '히스토리': 'history',
  '추천 가구': 'recommended_home'
};

// Parses existing bracketed introductions without changing the saved original text.
export function parseLegacyProfile(description = '') {
  const result = {};
  const segments = String(description).split(/\[([^\]]+)\]/g);
  if (segments.length < 3) return result;
  for (let i = 1; i < segments.length; i += 2) {
    const heading = segments[i].trim();
    const key = headingMap[heading] || (heading.endsWith('에게 필요한 가족') ? 'ideal_family' : '');
    if (!key) continue;
    const content = proofreadKorean(segments[i + 1] || '');
    if (content) result[key] = content;
  }
  const intro = proofreadKorean(segments[0].replace(/^.*?를 소개합니다\s*/s, '').replace(/^.*?이를 소개합니다\s*/s, ''));
  if (intro && !result.personality) result.personality = intro;
  return result;
}

export function getDogProfile(dog) {
  const legacy = parseLegacyProfile(dog?.description);
  const structured = dog?.profile && typeof dog.profile === 'object' && !Array.isArray(dog.profile) ? dog.profile : {};
  return structured.__structured === true ? structured : { ...legacy, ...structured };
}

export function profileSummary(dog) {
  const profile = getDogProfile(dog);
  return profile.personality || dog?.description?.split(/\n\s*\[/)[0]?.trim() || '아직 소개글이 등록되지 않았어요.';
}

export function formatDogDate(value) {
  if (!value) return '';
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text.replace(/-/g, '.') : '';
}
