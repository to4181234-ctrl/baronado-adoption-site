import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRatings, EMPTY_RATINGS } from '../lib/goRatings.js';

test('existing cards remain unrated and an author can leave traits blank', () => {
  assert.deepEqual(validateRatings({}), EMPTY_RATINGS);
  assert.deepEqual(validateRatings({ cuteness: 5, charm: 2, affection: null }), { cuteness: 5, charm: 2, affection: null });
});

test('scores only accept whole stars in the selected 1 to 5 range', () => {
  for (const score of [0, 6, -1, 2.5, '5', true]) assert.throws(() => validateRatings({ charm: score }));
  assert.throws(() => validateRatings({ obedience: 5 }));
  assert.throws(() => validateRatings([]));
});

test('validation returns a separate value without changing the input', () => {
  const original = { cuteness: 4 };
  const validated = validateRatings(original);
  assert.notEqual(original, validated);
  assert.deepEqual(original, { cuteness: 4 });
});
