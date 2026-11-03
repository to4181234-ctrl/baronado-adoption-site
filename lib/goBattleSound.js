// Uses the supplied, approved album loop and original individual battle cues.
import {createGameAudio,createMusicLoop,albumMusicFile,GAME_SOUND_KEY} from './goV3Audio.js';
export const BATTLE_SOUND_KEY=GAME_SOUND_KEY;
export function createBattleSound(){
 const audio=createGameAudio(),music=createMusicLoop(albumMusicFile,.42);let muted=true;
 function play(name){if(!muted)audio.play(name);}
 function stop(){audio.stop();music.stop();}
 function setMuted(value){muted=Boolean(value);if(muted)stop();}
 return {play,stop,startMusic:()=>{if(!muted)music.play();},duckMusic:()=>music.stop(),setMuted,dispose:()=>{audio.dispose();music.dispose();}};
}
