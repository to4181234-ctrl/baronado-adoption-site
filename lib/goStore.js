// Canonical stage 4 store contract. Actual eligibility and debits live in the SQL RPC.
export const STORE_PRICES=Object.freeze({random:200,specific:300});
export const STORE_NORMAL_SLOTS=Object.freeze([1,2,3,4]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validStoreUuid(value){return typeof value==='string'&&UUID.test(value);}
export function parseStorePurchase(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('구매 정보를 확인해주세요.');
 const {mode,requestId,dogId,slot}=body;
 if(!validStoreUuid(requestId))throw new Error('구매 요청 번호를 확인해주세요.');
 if(mode==='random'){
  if(dogId!==undefined||slot!==undefined)throw new Error('랜덤 구매에는 강아지나 카드를 지정하지 않아요.');
  return {mode,requestId,dogId:null,slot:null,price:STORE_PRICES.random};
 }
 if(mode==='specific'&&validStoreUuid(dogId)&&slot===undefined)
  return {mode,requestId,dogId,slot:null,price:STORE_PRICES.specific};
 throw new Error('지정 뽑기는 강아지만 선택해주세요.');
}
export function availableStoreItems(dogs=[]){
 return dogs.filter(d=>d.available&&!d.adopted).flatMap(d=>(d.slots||[])
  .filter(slot=>STORE_NORMAL_SLOTS.includes(slot.slot)&&!slot.owned)
  .map(slot=>({dogId:d.dogId,dogName:d.name,slot:slot.slot,price:STORE_PRICES.specific})));
}

/** Figma 558:607838: 300C chooses a dog, not an exact card slot. */
export function availableStoreDogs(dogs=[]){
 const items=availableStoreItems(dogs);
 return dogs.filter(dog=>items.some(item=>item.dogId===dog.dogId))
  .map(dog=>({dogId:dog.dogId,name:dog.name,missing:items.filter(i=>i.dogId===dog.dogId).length,collected:dog.collected||0,hiddenUnlocked:Boolean(dog.hidden?.unlocked),thumbnailUrl:dog.thumbnailUrl||null}));
}
