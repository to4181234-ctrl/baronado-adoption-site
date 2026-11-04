// Browser-local battle preference. Unsupported platforms (including iOS Safari) fail silently.
export const BATTLE_VIBRATION_KEY='baronado-go-battle-vibration';
const HIT_PATTERNS=[24,[38,20,34],[50,24,85]];

export function battleVibrationEnabled(){
 if(typeof window==='undefined')return false;
 try{return window.localStorage.getItem(BATTLE_VIBRATION_KEY)!=='off';}
 catch{return false;}
}
export function stopBattleVibration(){
 if(typeof navigator==='undefined'||typeof navigator.vibrate!=='function')return;
 try{navigator.vibrate(0);}catch{}
}
export function vibrateBattleHit(level){
 if(!battleVibrationEnabled()||typeof navigator==='undefined'||typeof document==='undefined'||document.hidden||typeof navigator.vibrate!=='function')return false;
 const index=Math.max(0,Math.min(2,Math.round(level)-1));
 try{return navigator.vibrate(HIT_PATTERNS[index]);}catch{return false;}
}
