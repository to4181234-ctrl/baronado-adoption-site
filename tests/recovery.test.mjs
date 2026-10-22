import test from 'node:test';
import assert from 'node:assert/strict';
import { getAgeInfo, getDogProfile, getShelterUrl } from '../lib/dogProfile.js';

test('keeps the old introduction and new profile fields together', () => {
  const dog = {
    age: '2살 추정',
    description: '깡지를 소개합니다\n[견종] 믹스\n[성격] 애교가 많은 친구에요',
    profile: { __structured: true, breed: '믹스', shelter_name: '구조 보호소', age_reference_date: '2025-10-22', age_reference_years: 2, age_auto_update: true }
  };
  assert.equal(getDogProfile(dog).shelter_name, '구조 보호소');
  assert.equal(getAgeInfo(dog, new Date(2026, 9, 23)).listDisplay, '약 3살 추정');
  assert.equal(getAgeInfo(dog, new Date(2026, 9, 23)).detailDisplay, '약 3살 1일 추정');
});

test('reads previously saved age and shelter fields without hiding profile data', () => {
  const dog = { age: '2살 추정', description: '', age_reference_date: '2026-10-20', age_reference_years: 2, age_auto_update: true,
    story: { answers: { family: '함께할 가족' }, extra_questions: [{ question: '산책?', answer: '좋아해요' }] },
    profile: { __structured: true, personality: '활발해요' } };
  assert.equal(getDogProfile(dog).ideal_family, '함께할 가족');
  assert.equal(getDogProfile(dog).extra_questions.length, 1);
  assert.equal(getAgeInfo(dog, new Date(2026, 9, 22)).detailDisplay, '약 2살 2일 추정');
  assert.equal(getShelterUrl('javascript:alert(1)'), '');
});
