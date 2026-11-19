import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GO_CARE_REWARD_COINS,GO_CARE_REWARD_DAILY_LIMIT} from '../lib/goCoins.js';
import {summarizeCareRewards} from '../lib/goStage3Quests.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('account daily care maximum is 10C once regardless of number of dogs',()=>{
 assert.equal(GO_CARE_REWARD_COINS,10);assert.equal(GO_CARE_REWARD_DAILY_LIMIT,1);
 assert.equal(summarizeCareRewards([]).maxRewardPerDay,10);
 assert.equal(summarizeCareRewards(['quest_care','care','care']).careRewardsToday,1);
 assert.equal(summarizeCareRewards(['quest_care','care']).remainingCareRewards,0);
 const sql=read('docs/sql/meonggo-care-once-10c-20261119-DRAFT.sql');
 assert.match(sql,/WHERE member_id=p_member_id AND local_day=v_today/);
 assert.match(sql,/event_type IN \('care','quest_care'\)/);
 assert.match(sql,/IF v_care_paid_today=0 THEN/);
 assert.match(sql,/FOR UPDATE/);
 assert.doesNotMatch(sql,/v_care_awarded|v_count <= 5/);
 assert.match(read('tests/fixtures/go-care-once-10c-assert.sql'),/Cross-dog action paid extra coins/);
});
test('quest display and coin summary use the same one-daily-care cap',()=>{
 assert.match(read('app/api/go/coins/route.js'),/careRewards: Math.min\(1,/);
 assert.match(read('components/GoQuests.js'),/id: 'care', title: '멍멍이 만나러가기', coins: 10/);
 assert.match(read('scripts/verify-go-integration-local.sh'),/meonggo-care-once-10c-20261119-DRAFT.sql/);
});
