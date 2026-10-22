import curatedStories from './curated-stories.js';

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

function previousProfile(dog) {
  const result = {};
  for (const key of ['age_reference_date', 'age_reference_date_none', 'age_reference_years', 'age_auto_update', 'shelter_name', 'shelter_url']) {
    if (dog?.[key] !== null && dog?.[key] !== undefined && dog?.[key] !== '') result[key] = dog[key];
  }
  const marker = String(dog?.description || '').match(/\n\n<!-- baronado-profile-v1:([^\n]*?) -->$/);
  if (marker) {
    try { Object.assign(result, JSON.parse(decodeURIComponent(marker[1]))); } catch { /* Keep original prose. */ }
  }
  const story = dog?.story || result.story;
  if (story && typeof story === 'object') {
    Object.assign(result, story.answers || {});
    if (story.answers?.family) result.ideal_family = story.answers.family;
    if (story.extra_questions) result.extra_questions = story.extra_questions;
    if (story.introduction && !result.personality) result.personality = story.introduction;
  }
  return result;
}

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
  const earlier = previousProfile(dog);
  const curated = curatedStories[dog?.id];
  const proofread = curated && curated.source === dog?.description ? {
    ...curated.story.answers,
    ideal_family: curated.story.answers?.family,
    extra_questions: curated.story.extra_questions,
    introduction: curated.story.introduction
  } : {};
  return structured.__structured === true
    ? { ...proofread, ...earlier, ...structured }
    : { ...legacy, ...proofread, ...earlier, ...structured };
}

export function profileSummary(dog) {
  const profile = getDogProfile(dog);
  return profile.introduction || profile.personality || dog?.description?.split(/\n\s*\[/)[0]?.trim() || '아직 소개글이 등록되지 않았어요.';
}

export function formatDogDate(value) {
  if (!value) return '';
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text.replace(/-/g, '.') : '';
}

export function getShelterUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

// A reference age is an estimate. Increment the day count until the next
// anniversary, then advance the estimated year count.
export function getAgeInfo(dog, now = new Date()) {
  const profile = getDogProfile(dog);
  const original = String(dog?.age || '나이 미정').replace(/(\d+)살\s*추정/g, '$1살 추정');
  const receivedDate = profile.age_reference_date_none ? null : profile.age_reference_date;
  const reference = receivedDate || dog?.arrived_at?.slice(0, 10);
  const years = Number(profile.age_reference_years);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reference || '') || profile.age_reference_years === '' || profile.age_reference_years == null || !Number.isInteger(years) || years < 0 || years > 30) {
    return { listDisplay: original, detailDisplay: original, referenceDisplay: '' };
  }
  const [year, month, day] = reference.split('-').map(Number);
  const referenceDay = Date.UTC(year, month - 1, day);
  if (new Date(referenceDay).toISOString().slice(0, 10) !== reference) {
    return { listDisplay: original, detailDisplay: original, referenceDisplay: '' };
  }
  const referenceDisplay = receivedDate
    ? `안내받은 날짜 ${formatDogDate(reference)} 기준 약 ${years}살 추정으로 안내받았습니다.`
    : `바로나도에 온 날 ${formatDogDate(reference)} 기준 약 ${years}살 추정으로 기록했습니다.`;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  if (!profile.age_auto_update || today < referenceDay) {
    return { listDisplay: original, detailDisplay: original, referenceDisplay };
  }
  let anniversaries = now.getFullYear() - year;
  let last = Date.UTC(year + anniversaries, month - 1, day);
  if (last > today) {
    anniversaries--;
    last = Date.UTC(year + anniversaries, month - 1, day);
  }
  const elapsedDays = Math.floor((today - last) / 86400000);
  const currentYears = years + anniversaries;
  return {
    listDisplay: `약 ${currentYears}살 추정`,
    detailDisplay: `약 ${currentYears}살 ${elapsedDays}일 추정`,
    referenceDisplay
  };
}
