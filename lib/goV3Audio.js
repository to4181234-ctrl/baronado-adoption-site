// Final approved MP3 assets from MeongGO_Individual_MP3_and_Handoff_20261031.
// Do not synthesize, replace, or play PREVIEW tracks in production.
import {prepareAudioGain,releaseAudioGain,gameAudioGain} from './goAudioGain.js';
import {createSfxTransport} from './goSfxTransport.js';
import {goMusicFile} from './goMusicCatalog.js';
export const GAME_SOUND_KEY='baronado-go-completion-sound';
const ROOT='/audio/meonggo/';
const tracks={
 collar:'SFX_10_Collar_Select.mp3',discover:'SFX_11_Dog_Discover.mp3',
 bark1:'SFX_12_Bark_Variant_01.mp3',bark2:'SFX_13_Bark_Variant_02.mp3',bark3:'SFX_14_Bark_Variant_03.mp3',
 snack:'SFX_15_Dog_Snack.mp3',praise:'SFX_16_Dog_Praise.mp3',play:'SFX_17_Dog_Play.mp3',
 shutter:'SFX_18_Camera_Shutter.mp3',acquire:'SFX_19_Card_Acquired.mp3',
 appear:'SFX_01_Card_Appear.mp3',select:'SFX_02_Card_Select.mp3',
 deselect:'SFX_03_Card_Deselect.mp3',ready:'SFX_04_Two_Cards_Ready.mp3',
 start:'SFX_05_Battle_Start.mp3',impact:'SFX_06_Battle_Impact.mp3',
 victory:'SFX_07_Battle_Victory.mp3',draw:'SFX_08_Battle_Draw.mp3',
 defeat:'SFX_09_Battle_Defeat.mp3'
};
export const audioFile=name=>tracks[name]?ROOT+tracks[name]:null;
export const albumMusicFile=goMusicFile('album');
export const discoveryMusicFile=goMusicFile('discovery');
export const battleMusicFile=goMusicFile('battle');
export const cameraMusicFile=goMusicFile('camera');
export function audioEnabled(){try{return localStorage.getItem(GAME_SOUND_KEY)!=='off';}catch{return true;}}
export function notifyAudioSettingChanged(){if(typeof window!=='undefined')window.dispatchEvent(new Event('go-v3-settings-changed'));}
export function createGameAudio(){
 return createSfxTransport({files:Object.fromEntries(Object.entries(tracks).map(([name,file])=>[name,ROOT+file])),enabled:audioEnabled,gainForFile:gameAudioGain});
}

// Autoplay may be denied; callers retry this same element on the first gesture.
export function createMusicLoop(file,volume=.48){
 let node=null,disposed=false,wanted=false,reported=false;
 function stop(){wanted=false;reported=false;node?.pause();}
 function play(){wanted=true;if(!file||disposed||typeof window==='undefined'||document.hidden||!audioEnabled())return;if(!node){node=new Audio(file);node.loop=true;node.volume=volume;}prepareAudioGain(node);return node.play().then(()=>{if(!reported&&new URLSearchParams(window.location.search).has('audioDebug')){console.debug('[MeongGO music] '+file+' playing');reported=true;}}).catch(()=>{});}
 function settings(){if(wanted&&audioEnabled())play();else node?.pause();}
 function visibility(){if(document.hidden)node?.pause();else if(wanted)play();}
 function gesture(){if(wanted)play();}
 if(typeof window!=='undefined'){window.addEventListener('go-v3-settings-changed',settings);document.addEventListener('visibilitychange',visibility);for(const event of ['pointerdown','touchend','click','keydown'])document.addEventListener(event,gesture,{capture:true,passive:true});}
 function dispose(){disposed=true;stop();if(node)releaseAudioGain(node);node=null;if(typeof window!=='undefined'){window.removeEventListener('go-v3-settings-changed',settings);document.removeEventListener('visibilitychange',visibility);for(const event of ['pointerdown','touchend','click','keydown'])document.removeEventListener(event,gesture,true);}}
 return {play,stop,dispose};
}

export function listenAudioSetting(listener){
 const sync=()=>listener(audioEnabled());sync();
 window.addEventListener('go-v3-settings-changed',sync);window.addEventListener('storage',sync);
 return()=>{window.removeEventListener('go-v3-settings-changed',sync);window.removeEventListener('storage',sync);};
}
