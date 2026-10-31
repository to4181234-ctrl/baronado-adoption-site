// Completion cue is the final, approved ZIP file. Never synthesize a substitute.
import {audioFile} from './goV3Audio.js';
export const COMPLETION_SOUND_KEY='baronado-go-completion-sound';
export function completionSoundEnabled(saved){return saved!=='off';}
export function createCompletionSound(){
 let sound=null,disposed=false;
 function prepare(){if(disposed||typeof window==='undefined')return Promise.resolve();if(!sound){sound=new Audio(audioFile('acquire'));sound.preload='auto';sound.volume=.72;}return Promise.resolve();}
 function stop(){if(sound){sound.pause();try{sound.currentTime=0;}catch{}}}
 function play(delay=0){
  if(disposed||typeof document==='undefined'||document.hidden||!completionSoundEnabled(localStorage.getItem(COMPLETION_SOUND_KEY)))return;
  prepare();stop();
  if(delay>0){ // Completion replay is initiated by a user gesture; a short delay is optional.
   return new Promise(resolve=>setTimeout(resolve,delay*1000)).then(()=>{if(!disposed&&!document.hidden&&completionSoundEnabled(localStorage.getItem(COMPLETION_SOUND_KEY)))sound?.play().catch(()=>{});});
  }
  sound?.play().catch(()=>{});
 }
 function dispose(){disposed=true;stop();sound=null;}
 return {prepare,play,stop,dispose};
}
