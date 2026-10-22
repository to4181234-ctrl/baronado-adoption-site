import test from 'node:test';
import assert from 'node:assert/strict';
import curatedStories from '../lib/curated-stories.js';
import { compactStory, parseLegacyDescription, storyForDog } from '../lib/dog-story.js';
import { getAgeInfo } from '../lib/profile.js';

test('existing copy maps to fixed questions while leaving source text intact', () => {
  const [id, profile] = Object.entries(curatedStories).find(([, item]) => item.story.answers.family);
  const dog = { id, description: profile.source };
  assert.equal(storyForDog(dog).answers.family, profile.story.answers.family);
  assert.equal(dog.description, profile.source);
  assert.notEqual(storyForDog({ ...dog, description: '새로 작성한 소개' }).introduction, profile.story.introduction);
});

test('custom legacy heading and additional question are retained', () => {
  const story = parseLegacyDescription('소개\n\n[견종]\n믹스\n\n[새 질문]\n답변\n\n[토리에게 필요한 가족]\n차분한 가족');
  assert.equal(story.answers.breed, '믹스');
  assert.equal(story.answers.family, '차분한 가족');
  assert.deepEqual(story.extra_questions, [{ question: '새 질문', answer: '답변' }]);
  assert.deepEqual(compactStory({ ...story, extra_questions: [...story.extra_questions, { question: '', answer: '' }] }).extra_questions, story.extra_questions);
});

test('listing omits elapsed days while detail retains them', () => {
  const age = getAgeInfo({ age: '2살 추정', age_reference_date: '2026-10-18', age_reference_years: 2, age_auto_update: true }, new Date('2026-10-21T12:00:00'));
  assert.equal(age.listDisplay, '약 2살 추정');
  assert.equal(age.display, '약 2살 3일 추정');
});
