// Preserve the supplied BGM and original MP3s while making each impact audibly stronger.
import {createGameAudio,createMusicLoop,battleMusicFile,GAME_SOUND_KEY,audioFile,audioEnabled} from './goV3Audio.js';
import {createSfxTransport} from './goSfxTransport.js';
export const BATTLE_SOUND_KEY=GAME_SOUND_KEY;

const MUSIC_VOLUME=.18;
const FIGHT_VOLUME=.10;
const HIT_GAIN=[1.1,1.4,1.7];
const HIT_BGM=[.020,.013,.007];
const IMPACT_DUCK_MS=470;

export function createBattleSound(){
 const audio=createGameAudio();
 let hitGain=HIT_GAIN[0];
 // This separate one-file transport allows a per-hit gain without changing other game sounds.
 const impacts=createSfxTransport({
  files:{impact:audioFile('impact')},
  enabled:audioEnabled,
  gainForFile:()=>hitGain
 });
 const music=createMusicLoop(battleMusicFile,MUSIC_VOLUME);
 let muted=true,duckTimer=null,fighting=false;

 function playImpact(level=1){
  if(muted)return false;
  const step=Math.max(0,Math.min(2,Math.round(level)-1));
  hitGain=HIT_GAIN[step];
  clearTimeout(duckTimer);
  music.setVolume(HIT_BGM[step]);
  duckTimer=setTimeout(()=>{
   duckTimer=null;
   music.setVolume(fighting?FIGHT_VOLUME:MUSIC_VOLUME);
  },IMPACT_DUCK_MS);
  return impacts.play('impact');
 }
 function play(name){
  if(muted)return false;
  if(name==='impact')return playImpact(1);
  if(name==='start'){fighting=true;music.setVolume(FIGHT_VOLUME);}
  return audio.play(name);
 }
 function stop(){
  clearTimeout(duckTimer);duckTimer=null;fighting=false;
  audio.stop();impacts.stop();music.stop();music.setVolume(MUSIC_VOLUME);
 }
 function startMusic(){if(!muted){music.setVolume(MUSIC_VOLUME);music.play();}}
 function setMuted(value){muted=Boolean(value);if(muted)stop();else music.play();}
 function dispose(){stop();audio.dispose();impacts.dispose();music.dispose();}
 return {play,playImpact,stop,startMusic,duckMusic:()=>music.stop(),setMuted,dispose};
}
