import assert from 'node:assert/strict';
import test from 'node:test';
import {drawGoRating,drawGoCardRatings,GO_RATING_WEIGHTS} from '../lib/goCardDraw.js';
test('Figma odds are 10/20/40/20/10',()=>{assert.deepEqual([...GO_RATING_WEIGHTS],[10,20,40,20,10]);assert.equal(GO_RATING_WEIGHTS.reduce((a,b)=>a+b,0),100);});
test('all 100 integer draws map to exact expected frequencies',()=>{const tally=[0,0,0,0,0];for(let roll=0;roll<100;roll++)tally[drawGoRating(()=>roll)-1]++;assert.deepEqual(tally,[10,20,40,20,10]);});
test('three traits are drawn independently by the server',()=>{const values=[0,35,99];const ratings=drawGoCardRatings(()=>values.shift());assert.deepEqual(ratings,{cuteness:1,charm:3,affection:5});});
test('bad rolls fail closed',()=>{assert.throws(()=>drawGoRating(()=>100));assert.throws(()=>drawGoRating(()=>-1));});
