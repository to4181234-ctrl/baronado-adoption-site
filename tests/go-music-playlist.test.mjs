import test from 'node:test';
import assert from 'node:assert/strict';
import {createMusicLoop} from '../lib/goV3Audio.js';

test('the album playlist advances on ended, preserves one player, respects mute, and cleans up',async()=>{
 const previous=new Map(['window','document','Audio','localStorage'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const documentEvents=new Map(),windowEvents=new Map(),players=[];let enabled=true;
 const events=map=>({addEventListener(t,f){if(!map.has(t))map.set(t,new Set());map.get(t).add(f);},removeEventListener(t,f){map.get(t)?.delete(f);}});
 class Audio{constructor(src){this.src=src;this.handlers=new Map();this.plays=0;this.pauses=0;players.push(this);}addEventListener(t,f){this.handlers.set(t,f);}removeEventListener(t){this.handlers.delete(t);}play(){this.plays++;return Promise.resolve();}pause(){this.pauses++;}}
 const doc={hidden:false,...events(documentEvents)};
 Object.defineProperties(globalThis,{window:{configurable:true,value:{...events(windowEvents),location:{search:''}}},document:{configurable:true,value:doc},Audio:{configurable:true,value:Audio},localStorage:{configurable:true,value:{getItem:()=>enabled?'on':'off'}}});
 try{
  const music=createMusicLoop(['/pallet.mp3','/lavender.mp3']);await music.play();
  assert.equal(players.length,1);const player=players[0];assert.equal(player.loop,false);assert.equal(player.volume,.2);
  player.handlers.get('ended')();assert.equal(player.src,'/lavender.mp3');assert.equal(players.length,1);
  player.handlers.get('ended')();assert.equal(player.src,'/pallet.mp3');
  music.setVolume(.035);assert.equal(player.volume,.035);
  enabled=false;for(const f of windowEvents.get('go-v3-settings-changed'))f();assert.equal(player.pauses,1);
  const count=player.plays;for(const f of documentEvents.get('click'))f();assert.equal(player.plays,count);
  enabled=true;for(const f of windowEvents.get('go-v3-settings-changed'))f();assert.equal(player.plays,count+1);
  music.dispose();assert.equal(player.handlers.has('ended'),false);assert.equal(documentEvents.get('click').size,0);
 }finally{for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
