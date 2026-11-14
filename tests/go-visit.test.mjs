import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVisitCode, isVisitRequestWindow, validVisitDecision } from '../lib/goVisit.js';

test('visit code is 8 hexadecimal characters and is case-normalized', () => {
  assert.equal(normalizeVisitCode(' a1b2c3d4 '),'A1B2C3D4');
  for (const value of ['ABCDEFGH','AAAAAA','',null,'A1B2C3D4DROP']) {
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
