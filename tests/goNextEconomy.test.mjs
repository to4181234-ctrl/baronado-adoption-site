import test from 'node:test';
import assert from 'node:assert/strict';
import {
 FREE_DRAWS_PER_KOREA_DAY,OWNED_CARD_PROBABILITY,RANDOM_STORE_COINS,
 SPECIFIC_STORE_COINS,chooseOwnedCard,freeDrawsRemaining,battlePayout
} from '../lib/goNextEconomyRules.js';
import {STORE_PRICES,availableStoreItems,availableStoreDogs,parseStorePurchase} from '../lib/goStore.js';
import {isQuestAvailable,visibleQuestRewards} from '../lib/goStage3Quests.js';

test('60C random and 100C selected-dog store, including fully collected dogs',()=>{
 assert.deepEqual(STORE_PRICES,{random:RANDOM_STORE_COINS,specific:SPECIFIC_STORE_COINS});
 const dog={dogId:'dog-1',name:'강아지',available:true,adopted:false,publishedComplete:true,
   collected:4,missing:0,slots:[1,2,3,4].map(slot=>({slot,owned:true}))};
 assert.equal(availableStoreItems([dog]).length,4);
 assert.equal(availableStoreDogs([dog]).length,1);
 assert.equal(availableStoreDogs([dog])[0].missing,0);
 const requestId='550e8400-e29b-41d4-a716-446655440000';
 const dogId='550e8400-e29b-41d4-a716-446655440001';
 assert.equal(parseStorePurchase({mode:'random',requestId}).price,60);
 assert.equal(parseStorePurchase({mode:'specific',requestId,dogId}).price,100);
 assert.throws(()=>parseStorePurchase({mode:'specific',requestId,dogId,slot:1}));
});
test('daily free draws grant only two slots, including legacy history',()=>{
 assert.equal(FREE_DRAWS_PER_KOREA_DAY,2);
 assert.equal(freeDrawsRemaining(0,0),2);
 assert.equal(freeDrawsRemaining(1,0),1);
 assert.equal(freeDrawsRemaining(1,1),0);
 assert.equal(freeDrawsRemaining(0,2),0);
 assert.equal(freeDrawsRemaining(0,3),0);
 assert.throws(()=>freeDrawsRemaining(-1,0));
});
test('60 percent owned bucket, 40 percent new, with empty-bucket fallback',()=>{
 assert.equal(OWNED_CARD_PROBABILITY,0.6);
 assert.equal(chooseOwnedCard({owned:0,missing:10},0.1),false);
 assert.equal(chooseOwnedCard({owned:10,missing:0},0.99),true);
 assert.equal(chooseOwnedCard({owned:0,missing:0},0.8),null);
 let ownedCount=0;
 for(let i=0;i<1000;i++)if(chooseOwnedCard({owned:1,missing:1},i/1000))ownedCount++;
 assert.equal(ownedCount,600);
 assert.throws(()=>chooseOwnedCard({owned:1,missing:1},1));
});
test('first completed battle gives 10C, later wins 3C, no cap',()=>{
 assert.equal(battlePayout({isFirstCompletedBattle:true,won:true}),10);
 assert.equal(battlePayout({isFirstCompletedBattle:true,won:false}),10);
 assert.equal(battlePayout({isFirstCompletedBattle:false,won:true}),3);
 assert.equal(battlePayout({isFirstCompletedBattle:false,won:false}),0);
});
test('free drawing is no longer a coin quest, other quests retain 50C maximum',()=>{
 assert.equal(isQuestAvailable('draw',{draw:true,battle:true}),false);
 assert.equal(visibleQuestRewards({battle:true}),50);
 assert.equal(visibleQuestRewards({battle:false}),40);
});
