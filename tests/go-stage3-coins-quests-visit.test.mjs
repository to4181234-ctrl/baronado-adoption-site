import test from 'node:test';
import assert from 'node:assert/strict';
import {koreaDay,parseCoinHistoryQuery,coinHistoryCategory,
 GO_CARE_REWARD_COINS,GO_CARE_REWARD_DAILY_LIMIT,
 GO_CARE_QUEST_COINS,GO_VISIT_QUEST_COINS} from '../lib/goCoins.js';
import {DAILY_QUESTS,isQuestAvailable,visibleQuestRewards,summarizeCareRewards} from '../lib/goStage3Quests.js';
import {isVisitRequestWindow,normalizeVisitCode,validVisitDecision} from '../lib/goVisit.js';

test('KST midnight is used, never browser local day',()=>{
 assert.equal(koreaDay('2026-11-16T14:59:59.000Z'),'2026-11-16');
 assert.equal(koreaDay('2026-11-16T15:00:00.000Z'),'2026-11-17');
 assert.equal(koreaDay('2026-12-31T15:00:00.000Z'),'2027-01-01');
 assert.throws(()=>koreaDay('not-a-date'),RangeError);
});
test('care reward daily cap 5x10, first care quest one additional 10',()=>{
 assert.equal(GO_CARE_REWARD_COINS,10);
 assert.equal(GO_CARE_REWARD_DAILY_LIMIT,5);
 assert.equal(GO_CARE_QUEST_COINS,10);
 assert.equal(GO_VISIT_QUEST_COINS,30);
 assert.deepEqual(summarizeCareRewards([]),{
   careRewardsToday:0,remainingCareRewards:5,firstCareQuestDone:false,
   maxRewardPerDay:50,firstQuestCoins:10,affinityAtCap:false
 });
 const all=['care','care','care','care','care','care','quest_care'];
 assert.equal(summarizeCareRewards(all).remainingCareRewards,0);
 assert.equal(summarizeCareRewards(all).careRewardsToday,5);
 assert.equal(summarizeCareRewards(all).firstCareQuestDone,true);
 assert.equal(summarizeCareRewards(all,10).affinityAtCap,true);
});
test('no unreleased quest is displayed and no fictitious reward',()=>{
 assert.deepEqual(Object.keys(DAILY_QUESTS),['care','visit','draw','battle']);
 assert.equal(visibleQuestRewards(),40);
 assert.equal(visibleQuestRewards({draw:true}),50);
 assert.equal(visibleQuestRewards({draw:true,battle:true}),60);
 assert.equal(isQuestAvailable('draw'),false);
 assert.equal(isQuestAvailable('battle',{draw:true}),false);
 assert.equal(isQuestAvailable('battle',{draw:true,battle:true}),true);
 assert.equal(isQuestAvailable('__proto__'),false);
});
test('coin history server query guards filter and offset',()=>{
 const q=(text)=>new URL('http://localhost/?'+text).searchParams;
 assert.deepEqual(parseCoinHistoryQuery(q('filter=earn&offset=20')),{filter:'earn',offset:20,limit:10});
 assert.equal(coinHistoryCategory(10),'earn');
 assert.equal(coinHistoryCategory(-30),'spend');
 for(const text of ['filter=x','offset=-1','offset=1e5','offset=10001','offset=01'])assert.throws(()=>parseCoinHistoryQuery(q(text)),RangeError);
});
test('visit codes reject leading spaces and non-six-digit values',()=>{
 assert.equal(normalizeVisitCode(' 001234 '),'001234');
 for(const bad of ['12345','1234567','12a456','00 1234',''])assert.equal(normalizeVisitCode(bad),null);
});
test('visit request open 09:00–20:59 KST, closed 21:00',()=>{
 assert.equal(isVisitRequestWindow('2026-11-16T23:59:59Z'),false);
 assert.equal(isVisitRequestWindow('2026-11-17T00:00:00Z'),true);
 assert.equal(isVisitRequestWindow('2026-11-17T11:59:59Z'),true);
 assert.equal(isVisitRequestWindow('2026-11-17T12:00:00Z'),false);
});
test('visit approval and staff rejection reasons validated',()=>{
 assert.equal(validVisitDecision('approve','ignored'),true);
 assert.equal(validVisitDecision('reject','no_purchase'),true);
 assert.equal(validVisitDecision('reject','not_present'),true);
 assert.equal(validVisitDecision('reject','unverifiable'),true);
 assert.equal(validVisitDecision('reject','free-form'),false);
 assert.equal(validVisitDecision('reverse','not_present'),false);
});
