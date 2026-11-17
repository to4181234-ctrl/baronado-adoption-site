import test from 'node:test';
import assert from 'node:assert/strict';
import {friendPvpResult,friendPvpOutcome,roomSecondsRemaining,formatPvpScore,
 FRIEND_PVP_JOIN_MS,FRIEND_PVP_READY_MS,FRIEND_PVP_RECONNECT_MS} from '../lib/goPvpRules.js';
test('PvP power + charm only, no elemental multiplier',()=>{
 const first={power:5,charm:3,element:'물결'};
 const second={power:3,charm:4,element:'햇살'};
 assert.deepEqual(friendPvpResult(first,second),{hostScore:8,guestScore:7,winner:'host'});
 assert.deepEqual(friendPvpResult(second,first),{hostScore:7,guestScore:8,winner:'guest'});
 assert.deepEqual(friendPvpResult({power:2,charm:5},{power:4,charm:3}),{hostScore:7,guestScore:7,winner:'draw'});
 assert.equal(friendPvpOutcome('guest','host'),'loss');
 assert.equal(friendPvpOutcome('draw','host'),'draw');
 assert.equal(friendPvpOutcome('host','host'),'win');
 assert.throws(()=>friendPvpResult({power:6,charm:1},{power:1,charm:1}));
 assert.throws(()=>friendPvpResult({power:1,charm:NaN},{power:1,charm:1}));
});
test('consistent invite/ready/disconnect clock windows and score labels',()=>{
 assert.equal(FRIEND_PVP_JOIN_MS,1800000);
 assert.equal(FRIEND_PVP_READY_MS,120000);
 assert.equal(FRIEND_PVP_RECONNECT_MS,30000);
 assert.equal(roomSecondsRemaining(new Date(10000).toISOString(),4000),6);
 assert.equal(roomSecondsRemaining(new Date(10000).toISOString(),10001),0);
 assert.equal(formatPvpScore({wins:3,draws:2,losses:1}),'3승 2무 1패');
});
