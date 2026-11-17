import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeDogCards } from '../lib/goStage2Collection.js';

const card = number => ({ number });

test('official and custom card totals are separate and additive', () => {
  assert.deepEqual(summarizeDogCards([card(1),card(2)], 3), {
    officialCount: 2, customCount: 3, totalCount: 5,
    collectedNormalKinds: 2, hiddenOwned: false,
    hiddenUnlockable: false, complete: false,
  });
});

test('duplicate official draws do not create additional owned copies', () => {
  const state = summarizeDogCards([card(1),card(1),card(2),card(3),card(4)], 2);
  assert.equal(state.officialCount, 4);
  assert.equal(state.totalCount, 6);
  assert.equal(state.collectedNormalKinds, 4);
  assert.equal(state.hiddenUnlockable, true);
});

test('hidden unlock requires all four normal types', () => {
  assert.equal(summarizeDogCards([1,2,3,5].map(card)).hiddenUnlockable, false);
  assert.equal(summarizeDogCards([1,2,3,4].map(card)).hiddenUnlockable, true);
});

test('already-owned hidden cannot be granted again', () => {
  const state = summarizeDogCards([1,2,3,4,5].map(card));
  assert.equal(state.hiddenUnlockable, false);
  assert.equal(state.complete, true);
});

test('unknown card numbers do not inflate official ownership', () => {
  assert.equal(summarizeDogCards([card(0),card(6),card(2)]).officialCount, 1);
});

test('invalid custom counts are rejected, not silently corrected', () => {
  assert.throws(() => summarizeDogCards([], -1), RangeError);
  assert.throws(() => summarizeDogCards([], 1.5), RangeError);
});
