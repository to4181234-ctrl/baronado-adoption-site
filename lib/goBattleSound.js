// Approved MeongGO ZIP, individual effect cues only.
// No battle BGM exists in the approved ZIP; never load external music.
import {createGameAudio,GAME_SOUND_KEY} from './goV3Audio.js';
export const BATTLE_SOUND_KEY=GAME_SOUND_KEY;
export function createBattleSound(){
 const audio=createGameAudio();
 let muted=true;
 function play(name){if(!muted)audio.play(name);}
 function stop(){audio.stop();}
 function setMuted(value){muted=Boolean(value);if(muted)stop();}
 return {play,stop,startMusic:()=>{},duckMusic:()=>{},setMuted,dispose:()=>audio.dispose()};
}
