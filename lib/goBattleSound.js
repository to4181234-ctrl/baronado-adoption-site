// Melodies derived from the user's approved original MeongGO 8-bit SFX previews.
export const BATTLE_SOUND_KEY='baronado-go-completion-sound';
export function createBattleSound(){
 let ctx=null,muted=true,music=null,active=[];
 const timings={
  appear:[[523.25,0,.09,.19],[659.25,.072,.1,.19],[783.99,.15,.13,.2]],
  select:[[740,0,.095,.28],[370,0,.07,.13]],
  deselect:[[580,0,.1,.23]],
  ready:[[659.25,0,.1,.23],[987.77,.102,.14,.24]],
  start:[[392,0,.15,.25],[293.66,.12,.16,.2],[196,.245,.16,.27]],
  impact:[[310,.015,.17,.27],[540,.055,.11,.12]],
  victory:[[523.25,0,.15,.2],[659.25,.14,.15,.22],[783.99,.29,.16,.24],[1046.5,.46,.4,.22]],
  draw:[[659.25,0,.17,.2],[783.99,.175,.17,.2],[659.25,.35,.23,.17]],
  defeat:[[659.25,0,.17,.19],[523.25,.17,.16,.20],[392,.33,.22,.21],[261.63,.56,.2,.17]]
 };
 function readyCtx(){try{if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;ctx=new C();}if(ctx.state==='suspended')ctx.resume().catch(()=>{});return ctx;}catch{return null;}}
 function play(name){if(muted||typeof document==='undefined'||document.hidden)return;const c=readyCtx();if(!c)return;const startTime=c.currentTime;for(const [freq,at,dur,vol] of timings[name]||[]){const osc=c.createOscillator(),gain=c.createGain();osc.type=name==='appear'||name==='deselect'||name==='draw'?'triangle':'square';osc.frequency.setValueAtTime(freq,startTime+at);gain.gain.setValueAtTime(0,startTime+at);gain.gain.linearRampToValueAtTime(vol*.28,startTime+at+.007);gain.gain.exponentialRampToValueAtTime(.0001,startTime+at+dur);osc.connect(gain);gain.connect(c.destination);osc.start(startTime+at);osc.stop(startTime+at+dur+.002);active.push(osc);osc.onended=()=>{active=active.filter(o=>o!==osc);};}}
 function stop(){for(const o of active){try{o.stop()}catch{}}active=[];if(music){music.pause();music.currentTime=0;}}
 function startMusic(){if(muted||typeof document==='undefined'||document.hidden)return;if(!music){music=new Audio('/api/go/battle/music');music.volume=.2;music.preload='auto';}music.pause();try{music.currentTime=1;}catch{}music.play().catch(()=>{});}
 function duckMusic(){if(!music||music.paused)return;music.volume=.07;setTimeout(()=>{if(music&&!music.paused)music.volume=.2;},300);}
 function setMuted(value){muted=value;if(muted)stop();}
 function dispose(){stop();ctx?.close().catch(()=>{});ctx=null;music=null;}
 return {play,stop,setMuted,startMusic,duckMusic,dispose};
}
