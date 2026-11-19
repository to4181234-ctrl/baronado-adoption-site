import test from 'node:test';
import assert from 'node:assert/strict';
import {STORE_PRICES,parseStorePurchase,availableStoreItems,availableStoreDogs,validStoreUuid} from '../lib/goStore.js';
const id='11111111-1111-4111-8111-111111111111',dog='22222222-2222-4222-8222-222222222222';
test('2.0 랜덤 60C / 일반 지정 100C only',()=>{
 assert.deepEqual(STORE_PRICES,{random:60,specific:100});
 assert.deepEqual(parseStorePurchase({mode:'random',requestId:id}),
  {mode:'random',requestId:id,dogId:null,slot:null,price:60});
 assert.deepEqual(parseStorePurchase({mode:'specific',requestId:id,dogId:dog}),
  {mode:'specific',requestId:id,dogId:dog,slot:null,price:100});
});
test('60C global random forbids filters; 100C dog-specific forbids slot targeting',()=>{
 for(const bad of [
  {mode:'random',requestId:id,dogId:dog},
  {mode:'random',requestId:id,slot:2},
  {mode:'specific',requestId:id,dogId:dog,slot:1},
  {mode:'specific',requestId:id,dogId:dog,slot:5},
  {mode:'specific',requestId:id,dogId:dog,slot:0},
  {mode:'specific',requestId:id,dogId:dog,slot:2.5},
  {mode:'specific',requestId:id,slot:2},
  {mode:'other',requestId:id},
  {mode:'random',requestId:'../../hack'},
  {mode:'random'},
  null,[],{}
 ])assert.throws(()=>parseStorePurchase(bad));
 assert.equal(validStoreUuid(id),true);
});
test('all normal slots remain drawable for available and not-adopted dogs',()=>{
 const dogs=[
  {dogId:dog,name:'깡지',available:true,adopted:false,publishedComplete:true,missing:3,
    slots:[{slot:1,owned:true},{slot:2,owned:false},{slot:3,owned:false},{slot:4,owned:false},{slot:5,owned:false}]},
  {dogId:id,name:'버디',available:false,adopted:false,slots:[{slot:1,owned:false}]},
  {dogId:'33333333-3333-4333-8333-333333333333',name:'오레오',
   available:true,adopted:true,slots:[{slot:1,owned:false}]}
 ];
 const items=availableStoreItems(dogs);
 assert.deepEqual(items.map(x=>x.slot),[1,2,3,4]);
 assert(items.every(x=>x.dogId===dog&&x.price===100));
 assert.deepEqual(availableStoreDogs(dogs),[{dogId:dog,name:'깡지',missing:3,collected:0,personalCount:0,hiddenUnlocked:false,hasAnyCard:false,thumbnailUrl:null}]);
});

