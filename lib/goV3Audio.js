// Original chiptune cue synthesis for the Figma game interactions.
// Global mute setting is shared with the battle and new-card screens.
export const GAME_SOUND_KEY='baronado-go-completion-sound';
export function createGameAudio(){
 let context=null,sources=[],timeouts=[];
 const notes={
  collar:[[698,.0,.085,.18],[1046,.08,.11,.15]],
  discover:[[392,0,.11,.17],[523,.13,.12,.2],[659,.27,.16,.18],[1046,.42,.2,.18]],
  bark1:[[220,0,.12,.18],[175,.12,.15,.16]],
  bark2:[[250,0,.12,.18],[187,.13,.14,.16]],
  bark3:[[209,0,.11,.17],[160,.11,.19,.14]],
  snack:[[570,0,.065,.11],[230,.1,.11,.12]],
  praise:[[587,0,.15,.14],[784,.18,.20,.16]],
  play:[[660,0,.08,.2],[440,.09,.13,.16]],
  shutter:[[1200,0,.035,.15],[720,.045,.075,.14]],
  acquire:[[523,0,.16,.16],[659,.18,.16,.17],[783,.36,.18,.16],[1046,.55,.32,.19]]
 };
 function ready(){try{if(!context){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;context=new C();}if(context.state==='suspended')context.resume().catch(()=>{});return context;}catch{return null;}}
 function muted(){try{return localStorage.getItem(GAME_SOUND_KEY)==='off';}catch{return false;}}
 function play(name){if(typeof document==='undefined'||document.hidden||muted())return;const c=ready();if(!c)return;const now=c.currentTime;for(const [freq,start,dur,level]of notes[name]||[]){const osc=c.createOscillator(),gain=c.createGain();osc.type='square';osc.frequency.setValueAtTime(freq,now+start);gain.gain.setValueAtTime(.0001,now+start);gain.gain.linearRampToValueAtTime(level*.22,now+start+.009);gain.gain.exponentialRampToValueAtTime(.0001,now+start+dur);osc.connect(gain);gain.connect(c.destination);osc.start(now+start);osc.stop(now+start+dur+.01);sources.push(osc);osc.onended=()=>{sources=sources.filter(x=>x!==osc)};}}
 function schedule(name,delay){const id=setTimeout(()=>{timeouts=timeouts.filter(x=>x!==id);play(name);},delay);timeouts.push(id);return id;}
 function stop(){for(const t of timeouts)clearTimeout(t);timeouts=[];for(const s of sources){try{s.stop()}catch{}}sources=[];}
 function dispose(){stop();context?.close().catch(()=>{});context=null;}
 return {play,schedule,stop,dispose};
}
