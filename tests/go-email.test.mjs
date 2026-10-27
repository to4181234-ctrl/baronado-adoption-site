import test from 'node:test';
import assert from 'node:assert/strict';
import { issueEmailProof,readEmailProof,emailCodeHash,normalizeEmail } from '../lib/server/goEmail.js';
test('email proofs are signed and tampering cannot authorize an account change',()=>{
 process.env.ADMIN_SESSION_SECRET='test-secret-at-least-thirty-two-characters-long';
 let cookie;
 issueEmailProof({cookies:{set:(name,value)=>{cookie={name,value};}}},'d0abc9ab-48cc-4ee3-b72a-e7d9ca0decda');
 const request={cookies:{get:()=>({value:cookie.value})}};
 assert.equal(readEmailProof(request),'d0abc9ab-48cc-4ee3-b72a-e7d9ca0decda');
 assert.equal(readEmailProof({cookies:{get:()=>({value:cookie.value.replace('d0abc9ab','d1abc9ab')})}}),null);
 assert.notEqual(emailCodeHash('a','123456'),emailCodeHash('b','123456'));
});
test('email addresses normalize but whitespace and multiple addresses are rejected',()=>{
 assert.equal(normalizeEmail(' User@EXAMPLE.com '),'user@example.com');
 assert.throws(()=>normalizeEmail('one@example.com\nBcc:two@example.com'));
});
