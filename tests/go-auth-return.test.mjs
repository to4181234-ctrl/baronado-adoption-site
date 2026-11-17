import test from 'node:test';
import assert from 'node:assert/strict';
import {safeGoReturnPath,authReturnContext} from '../lib/goAuthReturn.js';
test('OAuth return accepts only local game paths and preserves filters/hash',()=>{
 assert.equal(safeGoReturnPath('/go/community?q=buddy&page=2#cards'),'/go/community?q=buddy&page=2#cards');
 assert.equal(safeGoReturnPath('/go/battle?room=abc&google=error'),'/go/battle?room=abc');
 for(const path of ['https://evil.example','//evil.example/go','/admin','/go/../admin','/go/%2e%2e/admin','/go/%5cevil','/api/go/session','/good','/go/\\evil','/go\n/evil',undefined])assert.equal(safeGoReturnPath(path),'/go');
});
test('auth context expires, clamps scroll and never carries credentials',()=>{
 assert.equal(authReturnContext({path:'/go',at:0},600001),null);
 assert.equal(authReturnContext({path:'/go',at:20000},10000),null);
 assert.deepEqual(authReturnContext({path:'/go?dog=1',scroll:-20,at:100,password:'ignored'},200),{path:'/go?dog=1',scroll:0,at:100});
});
