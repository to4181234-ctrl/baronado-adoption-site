import test from 'node:test';
import assert from 'node:assert/strict';
import { koreaMonth,monthDate,rejectionText } from '../lib/goShared.js';
test('monthly picks switch at midnight in Korea, independent of server timezone',()=>{
 assert.equal(koreaMonth(new Date('2026-10-31T14:59:59Z')),'2026-10');
 assert.equal(koreaMonth(new Date('2026-10-31T15:00:00Z')),'2026-11');
 assert.equal(monthDate('2026-11'),'2026-11-01');
 assert.throws(()=>monthDate('2026-13'));
});
test('the owner sees the selected rejection reason or custom note',()=>{
 assert.equal(rejectionText({rejectionReason:'privacy'}),'사람 얼굴·개인정보가 보여요');
 assert.equal(rejectionText({rejectionReason:'other',rejectionNote:'다시 촬영해주세요.'}),'다시 촬영해주세요.');
});
