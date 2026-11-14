import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GO_CARE_REWARD_COINS, GO_CARE_REWARD_DAILY_LIMIT,
  GO_CARE_QUEST_COINS, GO_VISIT_QUEST_COINS,
  koreaDay, parseCoinHistoryQuery, coinHistoryCategory
} from '../lib/goCoins.js';

test('stage one coin rewards retain approved values', () => {
  assert.equal(GO_CARE_REWARD_COINS, 10);
  assert.equal(GO_CARE_REWARD_DAILY_LIMIT, 5);
  assert.equal(GO_CARE_QUEST_COINS, 10);
  assert.equal(GO_VISIT_QUEST_COINS, 30);
});

test('KST resets at midnight, not at UTC midnight', () => {
  assert.equal(koreaDay('2026-11-14T14:59:59.999Z'), '2026-11-14');
  assert.equal(koreaDay('2026-11-14T15:00:00.000Z'), '2026-11-15');
  assert.equal(koreaDay('2026-11-14T00:00:00.000Z'), '2026-11-14');
  assert.throws(() => koreaDay('not-a-date'), RangeError);
});

test('coin history only accepts supported filters and bounded offsets', () => {
  assert.deepEqual(parseCoinHistoryQuery(new URLSearchParams('')), { filter: 'all', offset: 0, limit: 10 });
  assert.deepEqual(parseCoinHistoryQuery(new URLSearchParams('filter=spend&offset=20')), { filter: 'spend', offset: 20, limit: 10 });
  for (const bad of ['filter=unknown', 'offset=-1', 'offset=1.5', 'offset=01', 'offset=10001', 'offset=999999999999999999999']) {
    assert.throws(() => parseCoinHistoryQuery(new URLSearchParams(bad)), RangeError);
  }
});

test('transaction history classifies positive and negative entries', () => {
  assert.equal(coinHistoryCategory(10), 'earn');
  assert.equal(coinHistoryCategory(-30), 'spend');
});
