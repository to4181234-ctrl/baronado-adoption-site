import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVisitCode, isVisitRequestWindow, validVisitDecision } from '../lib/goVisit.js';

test('visit code is exactly six numeric digits', () => {
  assert.equal(normalizeVisitCode(' 012345 '),'012345');
  for (const value of ['A1B2C3','ABCDEFGH','12345','1234567','',null,'123456DROP']) {
    assert.equal(normalizeVisitCode(value),null);
  }
});
test('Korean visit window is 09:00 inclusive to 21:00 exclusive', () => {
  assert.equal(isVisitRequestWindow('2026-11-14T00:00:00Z'),true);
  assert.equal(isVisitRequestWindow('2026-11-14T11:59:59Z'),true);
  assert.equal(isVisitRequestWindow('2026-11-14T12:00:00Z'),false);
  assert.equal(isVisitRequestWindow('2026-11-13T23:59:59Z'),false);
});
test('admin rejection reasons use an allowlist',()=>{
  assert.equal(validVisitDecision('approve',null),true);
  assert.equal(validVisitDecision('reject','no_purchase'),true);
  assert.equal(validVisitDecision('reject','anything'),false);
  assert.equal(validVisitDecision('cancel','no_purchase'),false);
});
