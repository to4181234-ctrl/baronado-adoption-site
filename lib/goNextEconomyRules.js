// Pure contract helpers for MeongGO 2.0 next-update economy.
// SQL RPCs are authoritative; this module keeps the UI/tests' expected policy explicit.
export const FREE_DRAWS_PER_KOREA_DAY = 2;
export const OWNED_CARD_PROBABILITY = 0.60;
export const RANDOM_STORE_COINS = 60;
export const SPECIFIC_STORE_COINS = 100;

export function chooseOwnedCard({owned,missing},sample=Math.random()){
 if(!Number.isSafeInteger(owned)||owned<0||!Number.isSafeInteger(missing)||missing<0)
  throw new RangeError('Card bucket counts must be nonnegative integers');
 if(!Number.isFinite(sample)||sample<0||sample>=1)
  throw new RangeError('Random sample must be in [0,1)');
 if(owned===0&&missing===0)return null;
 if(missing===0)return true;
 if(owned===0)return false;
 return sample<OWNED_CARD_PROBABILITY;
}
export function freeDrawsRemaining(legacyDraws,modernDraws){
 if(!Number.isSafeInteger(legacyDraws)||legacyDraws<0||
   !Number.isSafeInteger(modernDraws)||modernDraws<0)
  throw new RangeError('Draw counts must be nonnegative integers');
 return Math.max(0,FREE_DRAWS_PER_KOREA_DAY-legacyDraws-modernDraws);
}
export function battlePayout({isFirstCompletedBattle,won}){
 if(typeof isFirstCompletedBattle!=='boolean'||typeof won!=='boolean')
  throw new TypeError('Battle settlement inputs must be booleans');
 return isFirstCompletedBattle?10:(won?3:0);
}
