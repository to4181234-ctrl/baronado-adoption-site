import assert from 'node:assert/strict';
import test from 'node:test';
import { isMissingProfileColumn, readProfileDescription, writeProfileDescription } from '../lib/profile-storage.js';

test('fallback profile storage preserves the original description and round trips the fields', () => {
  const description = '기존 소개글\n\n[견종]\n믹스';
  const profile = { age_reference_date: '2026-10-21', age_reference_years: 2, age_auto_update: true,
    shelter_name: '구조 보호소', shelter_url: 'https://example.org', story: { introduction: '교정된 소개', answers: {}, extra_questions: [] } };
  const encoded = writeProfileDescription(description, profile);
  assert.deepEqual(readProfileDescription(encoded), { description, profile });
  assert.equal(writeProfileDescription(encoded, profile), encoded);
});

test('malformed text stays intact and unrelated database errors do not trigger fallback writes', () => {
  const raw = '소개글\n\n<!-- baronado-profile-v1:bad% -->';
  assert.equal(readProfileDescription(raw).description, raw);
  assert.equal(isMissingProfileColumn({ code: 'PGRST204', message: "Could not find 'story' column" }), true);
  assert.equal(isMissingProfileColumn({ code: '42501', message: 'permission denied' }), false);
});
