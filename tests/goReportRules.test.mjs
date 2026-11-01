import test from 'node:test';
import assert from 'node:assert/strict';
import {REPORT_REASONS,validateReport} from '../lib/goReportRules.mjs';
test('four Figma report reasons',()=>assert.deepEqual(REPORT_REASONS.map(v=>v[0]),['unrelated','inappropriate','spam','other']));
test('other requires 10-300 Korean characters',()=>{assert.throws(()=>validateReport('other','  짧아요  '));assert.equal(validateReport('other','내용을 반드시 확인해주세요').detail,'내용을 반드시 확인해주세요');assert.throws(()=>validateReport('other','가'.repeat(301)))});
test('non-other detail discarded',()=>assert.equal(validateReport('spam','ignored').detail,null));
test('invalid report reason rejected',()=>assert.throws(()=>validateReport('privacy')));
