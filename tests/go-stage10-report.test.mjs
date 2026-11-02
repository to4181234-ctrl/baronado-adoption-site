import test from 'node:test';
import assert from 'node:assert/strict';
import {validateReport} from '../lib/goReport.js';
import {cardFaceModel} from '../lib/goCardFace.js';
test('report requires one of four reasons and other details of 10–300 trimmed characters',()=>{
 for(const reason of ['unrelated','inappropriate','spam'])assert.deepEqual(validateReport({reason,details:'ignored'}),{reason,details:''});
 for(const value of [undefined,{},[],{reason:'privacy'},{reason:'other',details:'123456789'},{reason:'other',details:'x'.repeat(301)}])assert.throws(()=>validateReport(value));
 for(const n of [10,300])assert.equal(validateReport({reason:'other',details:' '+ '가'.repeat(n)+' '}).details.length,n);
});
test('card face prefers fixed server battle values and never lets out-of-range stars expand the card',()=>{
 const m=cardFaceModel({dogName:'뽀실',nickname:'작성자',battle:{power:99,charm:-1,element:'숲'},ratings:{cuteness:1,affection:5}});
 assert.equal(m.power,5);assert.equal(m.charm,0);assert.equal(m.author,'BY. 작성자');assert.match(m.icon,/forest/);
});
