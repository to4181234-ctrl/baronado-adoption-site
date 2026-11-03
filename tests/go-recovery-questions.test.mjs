import test from 'node:test';
import assert from 'node:assert/strict';
import { RECOVERY_QUESTIONS,recoveryAnswer,recoveryQuestion } from '../lib/goRecoveryQuestions.js';

test('recovery questions must be selected from the allowed list', () => {
  assert.equal(recoveryQuestion(RECOVERY_QUESTIONS[0]), RECOVERY_QUESTIONS[0]);
  assert.throws(() => recoveryQuestion('What is your password?'));
  assert.throws(() => recoveryQuestion(null));
});

test('security answers normalize consistently and have a minimum length', () => {
  assert.equal(recoveryAnswer('  Puppy  '), 'puppy');
  assert.equal(recoveryAnswer('ＡＢＣ'), 'abc');
  assert.throws(() => recoveryAnswer('a'));
  assert.throws(() => recoveryAnswer(' '.repeat(5)));
  assert.throws(() => recoveryAnswer('x'.repeat(81)));
});
