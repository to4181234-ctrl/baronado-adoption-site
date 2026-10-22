import curatedStories from './curated-stories.js';

export const STORY_FIELDS = [
  ['breed', '견종'],
  ['vaccinations', '접종 여부'],
  ['toilet', '배변 여부'],
  ['personality', '성격'],
  ['likes', '좋아하는 것'],
  ['dislikes', '싫어하는 것'],
  ['charm', '애교 포인트'],
  ['history', '히스토리'],
  ['recommended_home', '추천 가구'],
  ['family', '잘 어울리는 가족']
];

const FIELD_BY_LABEL = Object.fromEntries(STORY_FIELDS.map(([key, label]) => [label, key]));

export function emptyStory() {
  return { introduction: '', answers: Object.fromEntries(STORY_FIELDS.map(([key]) => [key, ''])), extra_questions: [] };
}

export function normalizeStory(value) {
  const story = emptyStory();
  if (!value || typeof value !== 'object') return story;
  story.introduction = String(value.introduction ?? '');
  for (const [key] of STORY_FIELDS) story.answers[key] = String(value.answers?.[key] ?? '');
  story.extra_questions = Array.isArray(value.extra_questions)
    ? value.extra_questions.slice(0, 20).map((entry) => ({ question: String(entry?.question ?? ''), answer: String(entry?.answer ?? '') }))
    : [];
  return story;
}

export function compactStory(value) {
  const story = normalizeStory(value);
  story.introduction = story.introduction.trim();
  for (const [key] of STORY_FIELDS) story.answers[key] = story.answers[key].trim();
  story.extra_questions = story.extra_questions
    .map(({ question, answer }) => ({ question: question.trim(), answer: answer.trim() }))
    .filter(({ question, answer }) => question && answer);
  return story;
}

export function parseLegacyDescription(description) {
  const result = emptyStory();
  const source = String(description || '').replace(/\r\n/g, '\n').trim();
  const headings = [...source.matchAll(/^\[([^\]\n]+)\]\s*$/gm)];
  if (!headings.length) {
    result.introduction = source;
    return result;
  }

  result.introduction = source.slice(0, headings[0].index).trim();
  headings.forEach((match, index) => {
    const label = match[1].trim();
    const answer = source.slice(match.index + match[0].length, headings[index + 1]?.index ?? source.length).trim();
    const key = FIELD_BY_LABEL[label] || (/에게 필요한 가족$/.test(label) ? 'family' : null);
    if (key) result.answers[key] = [result.answers[key], answer].filter(Boolean).join('\n\n');
    else if (answer) result.extra_questions.push({ question: label, answer });
  });
  return result;
}

export function storyForDog(dog) {
  if (dog?.story) return normalizeStory(dog.story);
  const curated = curatedStories[dog?.id];
  return curated && curated.source === dog.description
    ? normalizeStory(curated.story)
    : parseLegacyDescription(dog?.description);
}

export function storySummary(dog) {
  const story = storyForDog(dog);
  return story.introduction || story.answers.personality || dog?.description || '아직 소개글이 등록되지 않았어요.';
}
