import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizedPvpInvite} from '../lib/goPvpInvite.js';
const room='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
test('friend links and codes accepted, arbitrary URLs rejected',()=>{
 assert.equal(normalizedPvpInvite(room),room);
 assert.equal(normalizedPvpInvite('A1B2C3D4E5F6'),'A1B2C3D4E5F6');
 assert.equal(normalizedPvpInvite('https://baronado-adoption-site-8sm2.vercel.app/go/battle?room='+room),room);
 assert.equal(normalizedPvpInvite('https://test.vercel.app/go/battle/?room='+room),room);
 assert.equal(normalizedPvpInvite('https://evil.invalid/reset?room='+room),null);
 assert.equal(normalizedPvpInvite('http://example.com/go/battle?room=invalid'),null);
 assert.equal(normalizedPvpInvite('A1B2 C3D4E5F6'),null);
 assert.equal(normalizedPvpInvite('a'.repeat(301)),null);
});
