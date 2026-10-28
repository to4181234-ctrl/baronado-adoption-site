import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRatings,ratingsComplete,EMPTY_RATINGS} from '../lib/goRatings.js';
test('saving requires a score for every trait, while legacy blank data is not mutated',()=>{
 assert.throws(()=>validateRatings({}));assert.throws(()=>validateRatings({cuteness:5,charm:2,affection:null}));assert.equal(ratingsComplete(EMPTY_RATINGS),false);assert.deepEqual(EMPTY_RATINGS,{cuteness:null,charm:null,affection:null});
 const scores={cuteness:1,charm:5,affection:3};assert.deepEqual(validateRatings(scores),scores);assert.notEqual(validateRatings(scores),scores);assert.equal(ratingsComplete(scores),true);
});
test('only integer scores from one through five and known trait names are accepted',()=>{
 for(const score of [null,undefined,0,6,-1,2.5,'5',true]){const scores={cuteness:3,charm:score,affection:4};assert.throws(()=>validateRatings(scores));assert.equal(ratingsComplete(scores),false);}
 assert.throws(()=>validateRatings({cuteness:3,charm:3,affection:3,obedience:5}));assert.throws(()=>validateRatings([]));
});
