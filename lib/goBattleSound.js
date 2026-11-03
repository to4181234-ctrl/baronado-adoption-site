// Selected battle BGM stays pending until its actual MP3 is supplied. Original SFX are live.
import {createGameAudio,createMusicLoop,battleMusicFile,GAME_SOUND_KEY} from './goV3Audio.js';
export const BATTLE_SOUND_KEY=GAME_SOUND_KEY;
export function createBattleSound(){
 const audio=createGameAudio(),music=createMusicLoop(battleMusicFile,.42);let muted=true;
 function play(name){if(!muted)audio.play(name);}
 function stop(){audio.stop();music.stop();}
 function setMuted(value){muted=Boolean(value);if(muted)stop();}
 return {play,stop,startMusic:()=>{if(!muted)music.play();},duckMusic:()=>music.stop(),setMuted,dispose:()=>{audio.dispose();music.dispose();}};
}
