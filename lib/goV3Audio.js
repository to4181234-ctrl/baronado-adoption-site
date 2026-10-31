// Final approved MP3 assets from MeongGO_Individual_MP3_and_Handoff_20261031.
// Do not synthesize, replace, or play PREVIEW tracks in production.
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
export const albumMusicFile=ROOT+'BGM_02_Album_Original_Chiptune_Loop.mp3';
export const cameraMusicFile=ROOT+'BGM_03_Camera_Original_Suspense_Loop.mp3';
export function audioEnabled(){try{return localStorage.getItem(GAME_SOUND_KEY)!=='off';}catch{return true;}}
export function notifyAudioSettingChanged(){if(typeof window!=='undefined')window.dispatchEvent(new Event('go-v3-settings-changed'));}
export function createGameAudio(){
 let active=null,timers=[],last=new Map();
 function stop(){for(const id of timers)clearTimeout(id);timers=[];if(active){active.pause();active.currentTime=0;active=null;}}
 function play(name){
  if(typeof window==='undefined'||document.hidden||!audioEnabled())return;
  const file=audioFile(name);if(!file)return;
  // Avoid overlapping sound bursts during rapid taps.
  const now=Date.now();if(now-(last.get(name)||0)<220)return;last.set(name,now);
  stop();const sound=new Audio(file);active=sound;sound.volume=.72;
  sound.addEventListener('ended',()=>{if(active===sound)active=null;},{once:true});
  sound.play().catch(()=>{if(active===sound)active=null;});
 }
 function schedule(name,delay){const id=setTimeout(()=>{timers=timers.filter(x=>x!==id);play(name);},delay);timers.push(id);return id;}
 function dispose(){stop();}
 return {play,schedule,stop,dispose};
}
