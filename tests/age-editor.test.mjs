import test from 'node:test';
import assert from 'node:assert/strict';
import { elapsedCalendarMonths, getAgeInfo, getAgeEditorValues, getDogBirthDate, isDogBirthday } from '../lib/dogProfile.js';
import { dogPayload } from '../lib/server/adminData.js';

const today = (value) => new Date(`${value}T06:00:00Z`); // Same calendar date in Korea.

test('exact birthdays advance one calendar month, then carry to the next year', () => {
  const dog = { age: '1살', profile: { age_kind: 'exact', age_years: 1, age_months: 0, birth_date: '2025-10-22', age_auto_update: true } };
  assert.equal(getAgeInfo(dog, today('2026-11-21')).detailDisplay, '1살');
  assert.equal(getAgeInfo(dog, today('2026-11-22')).listDisplay, '1살 1개월');
  assert.equal(getAgeInfo(dog, today('2027-09-22')).detailDisplay, '1살 11개월');
  assert.equal(getAgeInfo(dog, today('2027-10-22')).detailDisplay, '2살');
});

test('the admin picker reflects the current calculated age for exact birthdays', () => {
  const dog = { age: '0살', profile: { age_kind: 'exact', age_years: 0, age_months: 0, birth_date: '2020-01-01', age_auto_update: true } };
  const values = getAgeEditorValues(dog);
  assert.ok(values.age_years >= 6);
  assert.ok(values.age_months >= 0 && values.age_months < 12);
});

test('estimated age starts at arrival and static age does not change', () => {
  const dog = { age: '1살 추정', arrived_at: '2026-02-28', profile: { age_kind: 'estimated', age_years: 1, age_months: 0, age_auto_update: true } };
  assert.equal(getAgeInfo(dog, today('2026-03-27')).listDisplay, '1살 추정');
  assert.equal(getAgeInfo(dog, today('2026-03-28')).detailDisplay, '1살 1개월 추정');
  dog.profile.age_auto_update = false;
  assert.equal(getAgeInfo(dog, today('2027-03-28')).detailDisplay, '1살 추정');
  assert.equal(elapsedCalendarMonths('2026-01-31', '2026-02-28'), 1);
});

test('resident birthday works with the existing date text; old age stays intact', () => {
  const dog = { category: 'resident', age: '2020.10.18', profile: {} };
  assert.equal(isDogBirthday(dog, today('2026-10-18')), true);
  assert.equal(isDogBirthday(dog, today('2026-10-19')), false);
  assert.equal(getDogBirthDate(dog), '2020-10-18');
  assert.equal(getAgeInfo(dog, today('2026-10-18')).listDisplay, '2020.10.18');
  assert.equal(getAgeEditorValues(dog).age_kind, 'exact');
});

test('known adoption birthdays show their date and emoji while estimated birthdays do not', () => {
  const dog = { category: 'adoption', age: '2살', profile: { age_kind: 'exact', age_years: 2, age_months: 0, birth_date: '2024-10-22', age_auto_update: true } };
  assert.equal(getDogBirthDate(dog), '2024-10-22');
  assert.equal(isDogBirthday(dog, today('2026-10-22')), true);
  assert.equal(isDogBirthday(dog, today('2026-10-23')), false);
  assert.equal(getAgeInfo(dog, today('2026-10-22')).referenceDisplay, '');
  dog.profile.age_kind = 'estimated';
  assert.equal(getDogBirthDate(dog), '');
  assert.equal(isDogBirthday(dog, today('2026-10-22')), false);
});

test('estimated age keeps the arrival date in its own line only', () => {
  const dog = { category: 'adoption', age: '2살 추정', arrived_at: '2026-10-17', profile: { age_kind: 'estimated', age_years: 2, age_months: 0, age_auto_update: true } };
  assert.equal(getAgeInfo(dog, today('2026-10-22')).referenceDisplay, '');
});

test('new age fields validate and keep resident profile data', () => {
  const form = { category: 'resident', age: '2살', images: [], profile: { age_kind: 'exact', age_years: 2, age_months: 1, birth_date: '2024-09-22', age_auto_update: true } };
  const payload = dogPayload(form);
  assert.equal(payload.profile.birth_date, '2024-09-22');
  assert.equal(payload.profile.age_months, 1);
  assert.throws(() => dogPayload({ ...form, profile: { ...form.profile, birth_date: '' } }), /생년월일/);
  const estimated = { ...form, category: 'adoption', profile: { age_kind: 'estimated', age_years: 1, age_months: 0, age_auto_update: true } };
  assert.throws(() => dogPayload(estimated), /바로나도에 온 날/);
});

test('completed adoptions keep their age at the adoption date', () => {
  const dog = { category: 'adoption', adopted: true, adopted_at: '2026-09-22', arrived_at: '2026-08-22', age: '1살 추정',
    profile: { age_kind: 'estimated', age_years: 1, age_months: 0, age_auto_update: true } };
  assert.equal(getAgeInfo(dog, today('2028-10-22')).detailDisplay, '1살 1개월 추정');
  const noDate = { ...dog, adopted_at: null, profile: { ...dog.profile, age_stopped_at: '2026-10-22' } };
  assert.equal(getAgeInfo(noDate, today('2028-10-22')).detailDisplay, '1살 2개월 추정');
  const payload = dogPayload({ ...dog, images: [] });
  assert.equal(payload.profile.age_stopped_at, '2026-09-22');
});
