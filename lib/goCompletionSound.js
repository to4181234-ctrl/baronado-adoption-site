// Viewing/replaying a card uses the supplied appearance cue, never issues an acquisition cue.
import {createGameAudio,GAME_SOUND_KEY} from './goV3Audio.js';
export const COMPLETION_SOUND_KEY=GAME_SOUND_KEY;
export function completionSoundEnabled(saved){return saved!=='off';}
export function createCompletionSound(){
 const audio=createGameAudio();
 return {prepare:()=>{audio.preload();return Promise.resolve();},play:(delay=0)=>{audio.stop();if(delay>0){audio.schedule('appear',delay*1000);return Promise.resolve(false);}return audio.play('appear');},stop:()=>audio.stop(),dispose:()=>audio.dispose()};
}
