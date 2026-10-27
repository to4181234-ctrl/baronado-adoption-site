import test from 'node:test';
import assert from 'node:assert/strict';
import { hashSecret, verifySecret, nicknameKey, passwordCheck } from '../lib/server/goAuth.js';

test('nicknames normalize consistently and reject whitespace/markup', () => {
  assert.deepEqual(nicknameKey('  Happy_Dog '), { nickname: 'Happy_Dog', key: 'happy_dog' });
  assert.throws(() => nicknameKey('<script>'));
  assert.throws(() => nicknameKey('이 름'));
});

test('password hashes are salted and only the correct secret verifies', async () => {
  const secret = passwordCheck('correct-horse-battery');
  const first = await hashSecret(secret);
  const second = await hashSecret(secret);
  assert.notEqual(first, second);
  assert.equal(await verifySecret(secret, first), true);
  assert.equal(await verifySecret('wrong-value', first), false);
  assert.equal(await verifySecret(secret, 'bad-hash'), false);
});

test('four-character passwords need no number or symbol rule', () => {
  assert.equal(passwordCheck('1234'), '1234');
  assert.equal(passwordCheck('abcd'), 'abcd');
  assert.throws(() => passwordCheck('abc'));
});
