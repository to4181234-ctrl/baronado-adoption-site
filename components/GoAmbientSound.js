'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {GAME_SOUND_KEY} from '../lib/goV3Audio.js';

// Original 8-bit ambient motif, not a recreation of any copyrighted game soundtrack.
// Browser sound unlock: starts only after a user click/tap.
const calm=[440,523.25,659.25,523.25,392,493.88,587.33,493.88,349.23,440,523.25,440,392,523.25,440,329.63];
const suspense=[220,246.94,293.66,246.94,220,329.63,293.66,246.94,196,246.94,293.66,329.63,220,246.94,392,293.66];
export default function GoAmbientSound(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname?.startsWith('/go/battle')||!pathname?.startsWith('/go'))return;
  let ctx=null,unlocked=false,step=0,mode='calm',interval=null;
  const enabled=()=>{try{return localStorage.getItem(GAME_SOUND_KEY)!=='off';}catch{return true;}};
  function note(frequency){
   if(!ctx||ctx.state!=='running'||!enabled()||document.hidden)return;
   const osc=ctx.createOscillator(),amp=ctx.createGain(),now=ctx.currentTime,dur=.17;
   osc.type='triangle';osc.frequency.setValueAtTime(frequency,now);
   amp.gain.setValueAtTime(.0001,now);
   amp.gain.exponentialRampToValueAtTime(.018,now+.015);
   amp.gain.exponentialRampToValueAtTime(.0001,now+dur);
   osc.connect(amp).connect(ctx.destination);osc.start(now);osc.stop(now+dur+.02);
  }
  function tick(){if(!unlocked||document.hidden||!enabled())return;const seq=mode==='camera'?suspense:calm;
   const frequency=seq[step%seq.length];if(step%2===0||mode==='camera')note(frequency);step++;
  }
  function gesture(){if(unlocked)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;ctx=new Audio();unlocked=true;ctx.resume().catch(()=>{});interval=setInterval(tick,mode==='camera'?205:275);}catch{}}
  function change(event){mode=event?.detail==='camera'?'camera':'calm';step=0;if(interval){clearInterval(interval);interval=setInterval(tick,mode==='camera'?205:275);}}
  function hidden(){if(document.hidden){ctx?.suspend().catch(()=>{});}else if(unlocked&&enabled())ctx?.resume().catch(()=>{});}
  document.addEventListener('pointerdown',gesture,{passive:true});
  document.addEventListener('keydown',gesture);
  document.addEventListener('visibilitychange',hidden);
  window.addEventListener('go-v3-music',change);
  return()=>{document.removeEventListener('pointerdown',gesture);document.removeEventListener('keydown',gesture);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('go-v3-music',change);if(interval)clearInterval(interval);ctx?.close().catch(()=>{});};
 },[pathname]);
 return null;
}
