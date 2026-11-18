import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeBattles} from '../lib/goBattleHistory.js';
import {loadBattleHistory} from '../lib/server/goBattleHistory.js';
test('wins, losses and draws use each dog perspective across swapped card order',()=>{
 const rows=[{first_dog_id:'a',second_dog_id:'b',winner:'first'},{first_dog_id:'b',second_dog_id:'a',winner:'second'},{first_dog_id:'a',second_dog_id:'c',winner:'draw'}];
 assert.deepEqual(summarizeBattles(rows),{a:{wins:2,losses:0,draws:1,total:3},b:{wins:0,losses:2,draws:0,total:2},c:{wins:0,losses:0,draws:1,total:1}});
 assert.deepEqual(summarizeBattles([]),{});
});
test('shared history uses exact owner-scoped SQL aggregates beyond the API row cap',async()=>{
 const calls=[];const db={async rpc(name,args){calls.push({name,args});return {data:[{dog_id:'owned-dog',wins:'1001',draws:'2',losses:'3'}],error:null};}};
 assert.deepEqual(await loadBattleHistory(db,'signed-in-member'),{'owned-dog':{wins:1001,draws:2,losses:3,total:1006}});
 assert.deepEqual(calls,[{name:'go_dog_battle_totals',args:{p_member:'signed-in-member'}}]);
});
test('history errors propagate instead of displaying an incorrect empty history',async()=>{
 const failure=new Error('database unavailable');await assert.rejects(loadBattleHistory({rpc:async()=>({data:null,error:failure})},'member'),failure);
});
