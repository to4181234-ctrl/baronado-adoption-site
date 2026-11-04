// Supplied 8bit BGM and original impact MP3 are preserved.
// Only the battle collision sound balance is adjusted.
import {createGameAudio,createMusicLoop,battleMusicFile,GAME_SOUND_KEY} from './goV3Audio.js';
export const BATTLE_SOUND_KEY=GAME_SOUND_KEY;

const MUSIC_VOLUME=.18;
const FIGHT_VOLUME=.10;
const IMPACT_VOLUME=.008;
const IMPACT_DUCK_MS=800;

export function createBattleSound(){
 const audio=createGameAudio({impactGain:1.7});
 const music=createMusicLoop(battleMusicFile,MUSIC_VOLUME);
 let muted=true,duckTimer=null,fighting=false;

 function play(name){
  if(muted)return;
  if(name==='start'){
   fighting=true;
   music.setVolume(FIGHT_VOLUME);
  }
  if(name==='impact'){
   clearTimeout(duckTimer);
   // Keep BGM quiet across successive hits so the collision stays in front.
   music.setVolume(IMPACT_VOLUME);
   duckTimer=setTimeout(()=>{
    duckTimer=null;
    music.setVolume(fighting?FIGHT_VOLUME:MUSIC_VOLUME);
   },IMPACT_DUCK_MS);
  }
  return audio.play(name);
 }
 function stop(){
  clearTimeout(duckTimer);
  duckTimer=null;
  fighting=false;
  audio.stop();
  music.stop();
  music.setVolume(MUSIC_VOLUME);
 }
 function startMusic(){
  if(!muted){music.setVolume(MUSIC_VOLUME);music.play();}
 }
 function setMuted(value){
  muted=Boolean(value);
  if(muted)stop();else music.play();
 }
 return {
  play,stop,startMusic,duckMusic:()=>music.stop(),setMuted,
  dispose:()=>{clearTimeout(duckTimer);audio.dispose();music.dispose();}
 };
}
