// Audio preview sounds correspond to the original, user-approved MeongGO 8-bit cues.
// Generated client-side from the approved synthesis score to avoid external SFX requests.
export const BATTLE_SOUND_KEY='baronado-go-completion-sound';
const RATE=24000;
const definitions={
 appear:[.34,[[0,523.25,.09,.19,'triangle'],[.072,659.25,.10,.19],[.15,783.99,.13,.2]]],
 select:[.16,[[0,740,.095,.28,'square',890,.004,.05],[0,370,.07,.13,'triangle']]],
 deselect:[.17,[[0,580,.10,.23,'triangle',380,.004,.06]]],
 ready:[.29,[[0,659.25,.10,.23],[.102,987.77,.14,.24,'square',null,.004,.1]]],
 start:[.45,[[0,392,.15,.25,'square',null,.004,.05],[.12,293.66,.16,.2,'square',null,.004,.08],[.245,196,.16,.27,'square',null,.004,.1],[.245,98,.16,.15,'sine',null,.004,.11]]],
 impact:[.33,[[.015,310,.17,.27,'square',130,.004,.095],[.055,540,.11,.12,'triangle',320,.004,.07]]],
 victory:[.97,[[0,523.25,.15,.2,'square',null,.004,.1],[.14,659.25,.15,.22,'square',null,.004,.1],[.29,783.99,.16,.24,'square',null,.004,.1],[.46,1046.5,.40,.22,'square',null,.004,.2],[.29,391.995,.16,.09,'triangle',null,.004,.1],[.46,523.25,.4,.09,'triangle',null,.004,.18]]],
 draw:[.62,[[0,659.25,.17,.20,'triangle'],[.175,783.99,.17,.20,'triangle'],[.35,659.25,.23,.17,'square',null,.004,.15]]],
 defeat:[.93,[[0,622.25,.19,.15,'square',612.29,.004,.060],[.158,493.88,.19,.14,'square',484.99,.004,.065],[.316,392,.20,.14,'square',382.2,.004,.08],[.487,311.13,.20,.13,'square',300.24,.004,.09],[.67,196,.2,.16,'square',178.36,.004,.11]]]
};
function envelope(index,n,attack,release){
 const age=index/RATE,rem=(n-index-1)/RATE;
 return Math.min(1,age/Math.max(.0001,attack))*Math.min(1,Math.pow(Math.max(0,rem/Math.max(.0001,release)),1.7));
}
function makeSound(name,ctx){
 const [length,notes]=definitions[name]||[.1,[]],samples=new Float32Array(Math.round(length*RATE));
 for(const [at,freq,dur,vol,shape='square',endFreq=null,attack=.004,release=.035] of notes){
  const begin=Math.round(at*RATE),count=Math.min(Math.round(dur*RATE),samples.length-begin);
  let phase=0;
  for(let i=0;i<count;i++){
   const f=endFreq===null?freq:freq+(endFreq-freq)*(i/count);
   phase+=2*Math.PI*f/RATE;
   let wave=shape==='triangle'?(2/Math.PI)*Math.asin(Math.sin(phase)):shape==='sine'?Math.sin(phase):.85*Math.sign(Math.sin(phase))+.15*Math.sin(phase);
   samples[begin+i]+=wave*vol*envelope(i,count,attack,release);
  }
 }
 if(name==='impact'){
  let seed=72106,noise=0;
  const count=Math.round(.05*RATE);
  for(let i=0;i<count;i++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;
   const raw=seed/2147483648-1;
   noise=noise*.8+raw*.2;
   samples[i]+=.40*noise*envelope(i,count,.001,.037);
  }
 }
 let max=0;for(let i=0;i<samples.length;i++)max=Math.max(max,Math.abs(samples[i]));
 const norm=max>.7?.70/max:1,den=Math.tanh(1.15);
 for(let i=0;i<samples.length;i++){
  const clipped=Math.tanh(samples[i]*norm*1.15)/den;
  const quantized=Math.round(clipped*127)/127;
  samples[i]=Math.max(-1,Math.min(1,quantized*envelope(i,samples.length,.004,.04)));
 }
 const buffer=ctx.createBuffer(1,samples.length,RATE);
 buffer.copyToChannel(samples,0);
 return buffer;
}
export function createBattleSound(){
 let context=null,music=null,muted=true,sources=[],buffers=new Map(),restore=null;
 function getContext(){
  try{if(!context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return null;context=new Audio();}
   if(context.state==='suspended')context.resume().catch(()=>{});
   return context;
  }catch{return null;}
 }
 function play(name){
  if(muted||typeof document==='undefined'||document.hidden)return;
  const ctx=getContext();if(!ctx)return;
  try{
   if(!buffers.has(name))buffers.set(name,makeSound(name,ctx));
   const src=ctx.createBufferSource(),gain=ctx.createGain();
   src.buffer=buffers.get(name);gain.gain.value=.63;src.connect(gain).connect(ctx.destination);
   sources.push(src);src.onended=()=>{sources=sources.filter(s=>s!==src);};
   src.start();
  }catch{}
 }
 function stop(){
  for(const src of sources){try{src.stop()}catch{}}sources=[];
  if(restore){clearTimeout(restore);restore=null;}
  if(music){music.pause();try{music.currentTime=0;}catch{}}
 }
 function startMusic(){
  if(muted||typeof document==='undefined'||document.hidden)return;
  if(!music){
   music=new Audio('/api/go/battle/music');music.preload='auto';music.volume=.18;
   music.addEventListener('error',()=>{
    if(music&&!music.dataset.fallback){music.dataset.fallback='1';music.src='https://opengameart.org/sites/default/files/8bit_action_boss_battle_bpm145.mp3';music.play().catch(()=>{});}
   });
  }
  music.pause();music.volume=.18;
  try{music.currentTime=1;}catch{}
  music.play().catch(()=>{});
 }
 function duckMusic(){
  if(!music||music.paused)return;music.volume=.045;
  if(restore)clearTimeout(restore);
  restore=setTimeout(()=>{if(music&&!music.paused)music.volume=.18;restore=null;},300);
 }
 function setMuted(value){muted=Boolean(value);if(muted)stop();}
 function dispose(){stop();context?.close().catch(()=>{});context=null;music=null;buffers.clear();}
 return {play,stop,startMusic,duckMusic,setMuted,dispose};
}
