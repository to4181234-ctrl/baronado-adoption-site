import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeBattles} from '../lib/goBattleHistory.js';
import {loadBattleHistory} from '../lib/server/goBattleHistory.js';
test('wins, losses and draws use each dog perspective across swapped card order',()=>{
 const rows=[{first_dog_id:'a',second_dog_id:'b',winner:'first'},{first_dog_id:'b',second_dog_id:'a',winner:'second'},{first_dog_id:'a',second_dog_id:'c',winner:'draw'}];
 assert.deepEqual(summarizeBattles(rows),{a:{wins:2,losses:0,draws:1,total:3},b:{wins:0,losses:2,draws:0,total:2},c:{wins:0,losses:0,draws:1,total:1}});
 assert.deepEqual(summarizeBattles([]),{});
});
test('history reads beyond the Data API row limit and scopes every page to the signed-in member',async()=>{
 const rows=Array.from({length:1001},(_,i)=>({id:i,first_dog_id:'a',second_dog_id:'b',winner:'draw'})),calls=[];
 const db={from(table){assert.equal(table,'go_battles');return {select(){return this;},eq(column,value){assert.equal(column,'member_id');assert.equal(value,'signed-in-member');return this;},order(){return this;},range(start,end){calls.push([start,end]);return Promise.resolve({data:rows.slice(start,end+1),error:null});}};}};
 const totals=await loadBattleHistory(db,'signed-in-member');assert.equal(totals.a.draws,1001);assert.equal(totals.b.total,1001);assert.deepEqual(calls,[[0,499],[500,999],[1000,1499]]);
});
test('history errors propagate instead of displaying an incorrect empty history',async()=>{
 const failure=new Error('database unavailable');const chain={select(){return this;},eq(){return this;},order(){return this;},range(){return {data:null,error:failure};}};
 await assert.rejects(loadBattleHistory({from:()=>chain},'member'),failure);
});
