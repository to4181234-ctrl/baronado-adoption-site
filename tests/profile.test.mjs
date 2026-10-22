import assert from 'node:assert/strict';
import test from 'node:test';
import { getAgeInfo, getShelterUrl } from '../lib/profile.js';

const dog = {
  age: '2살 추정',
  age_reference_date: '2026-10-21',
  age_reference_years: 2,
  age_auto_update: true
};

test('the estimated day count advances and rolls over at the anniversary', () => {
  assert.equal(getAgeInfo(dog, new Date(2026, 9, 24)).display, '약 2살 3일 추정');
  assert.equal(getAgeInfo(dog, new Date(2027, 9, 21)).display, '약 3살 0일 추정');
});

test('turning the calculation off keeps the written age and reference note', () => {
  const result = getAgeInfo({ ...dog, age_auto_update: false }, new Date(2027, 9, 21));
  assert.equal(result.display, '2살 추정');
  assert.match(result.reference, /2026\.10\.21 기준 약 2살/);
});

test('existing posts without age fields keep the old display', () => {
  assert.deepEqual(getAgeInfo({ age: '8~9살 추정' }), { display: '8~9살 추정', listDisplay: '8~9살 추정', reference: '' });
});

test('only web URLs become shelter links', () => {
  assert.equal(getShelterUrl('javascript:alert(1)'), '');
  assert.equal(getShelterUrl('https://example.org/'), 'https://example.org/');
});
