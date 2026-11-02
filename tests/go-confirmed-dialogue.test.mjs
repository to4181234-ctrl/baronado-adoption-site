import test from 'node:test';
import assert from 'node:assert/strict';
import {GO_CONFIRMED_DIALOGUE,getGoDialogue,goDialogueTier} from '../lib/goConfirmedDialogue.js';
test('five dogs have exactly 13 confirmed lines each',()=>{
 assert.equal(Object.keys(GO_CONFIRMED_DIALOGUE).length,5);
 for(const dog of Object.values(GO_CONFIRMED_DIALOGUE)){
   assert.equal(dog.tiers.length,3);
   assert.ok(dog.discovery);
   for(const tier of dog.tiers)assert.deepEqual(Object.keys(tier).sort(),['greeting','play','praise','snack']);
 }
});
test('affinity tier boundaries',()=>{
 assert.equal(goDialogueTier(3),0);assert.equal(goDialogueTier(4),1);assert.equal(goDialogueTier(7),1);assert.equal(goDialogueTier(8),2);assert.equal(goDialogueTier(10),2);
});
test('dialogue uses dog, tier, action',()=>{
 assert.match(getGoDialogue('버디',1,'play'),/준비됐지/);
 assert.match(getGoDialogue('뽀실',5,'snack'),/한 판 더/);
 assert.match(getGoDialogue('오레오',9,'greeting'),/네 옆은 괜찮아/);
 assert.match(getGoDialogue('구름',0,'discovery'),/천천히 와 줄래/);
 assert.equal(getGoDialogue('없는 강아지',3),null);
});
