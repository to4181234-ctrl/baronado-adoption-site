import test from 'node:test';
import assert from 'node:assert/strict';
import {battleScore,ELEMENT_CYCLE} from '../lib/goBattleRules.js';
test('The six element cycle grants +2 only to the advantaged side',()=>{
 for(let i=0;i<6;i++){
  const a={power:3,charm:3,element:ELEMENT_CYCLE[i]},b={power:3,charm:3,element:ELEMENT_CYCLE[(i+1)%6]};
  assert.deepEqual(battleScore(a,b),{bonusA:2,bonusB:0,scoreA:8,scoreB:6,winner:'first'});
 }
});
test('Tie keeps both cards and neither side receives a bonus',()=>{
 const a={power:5,charm:2,element:'숲'},b={power:4,charm:3,element:'온기'};
 assert.equal(battleScore(a,b).winner,'draw');
});
test('Underdog can still win with a strong base score',()=>{
 const a={power:1,charm:2,element:'햇살'},b={power:5,charm:4,element:'숲'};
 assert.equal(battleScore(a,b).winner,'second');
});
test('Invalid power and element values are rejected',()=>{
 assert.throws(()=>battleScore({power:0,charm:5,element:'숲'},{power:3,charm:3,element:'온기'}));
 assert.throws(()=>battleScore({power:3,charm:3,element:'미정'},{power:3,charm:3,element:'온기'}));
});
