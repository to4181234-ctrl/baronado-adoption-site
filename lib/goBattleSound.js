// Supplied 8bit BGM plays during card selection and the fight.
import {createGameAudio,createMusicLoop,battleMusicFile,GAME_SOUND_KEY} from './goV3Audio.js';
export const BATTLE_SOUND_KEY=GAME_SOUND_KEY;
export function createBattleSound(){
 const audio=createGameAudio(),music=createMusicLoop(battleMusicFile,.18);let muted=true,duckTimer=null;
 function play(name){if(muted)return;if(name==='impact'){clearTimeout(duckTimer);music.setVolume(.035);duckTimer=setTimeout(()=>music.setVolume(.18),650);}return audio.play(name);}
 function stop(){clearTimeout(duckTimer);audio.stop();music.stop();music.setVolume(.18);}
 function setMuted(value){muted=Boolean(value);if(muted)stop();else music.play();}
 return {play,stop,startMusic:()=>{if(!muted)music.play();},duckMusic:()=>music.stop(),setMuted,dispose:()=>{clearTimeout(duckTimer);audio.dispose();music.dispose();}};
}
