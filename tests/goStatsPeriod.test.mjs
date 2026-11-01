import test from 'node:test';
import assert from 'node:assert/strict';
import {kstDate,periodRange,groupKey,safeCsv} from '../lib/goStatsPeriod.mjs';
test('KST date shifts midnight UTC',()=>assert.equal(kstDate('2026-10-31T15:00:00.000Z'),'2026-11-01'));
test('seven days includes both endpoints',()=>{const p=periodRange({days:7,now:new Date('2026-11-01T12:00:00Z')});assert.equal(p.first,'2026-10-26');assert.equal(p.last,'2026-11-01');assert.equal(p.count,7)});
test('KST boundary opens at previous day 15:00Z',()=>{const p=periodRange({start:'2026-11-01',end:'2026-11-01'});assert.equal(p.startIso,'2026-10-31T15:00:00.000Z');assert.equal(p.endIso,'2026-11-01T15:00:00.000Z')});
test('month and week groups follow KST',()=>{assert.equal(groupKey('2026-11-01T12:00:00Z','month'),'2026-11');assert.equal(groupKey('2026-11-01T12:00:00Z','week'),'2026-10-26')});
test('invalid ranges reject',()=>{assert.throws(()=>periodRange({start:'2026-10-31',end:'2026-10-30'}));assert.throws(()=>periodRange({start:'2026-02-30',end:'2026-03-01'}))});
test('CSV formula injection and commas escaped',()=>{assert.equal(safeCsv('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');assert.equal(safeCsv('a,b'),'"a,b"')});
