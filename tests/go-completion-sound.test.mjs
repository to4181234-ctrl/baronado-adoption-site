import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompletionSound,completionSoundEnabled} from '../lib/goCompletionSound.js';
test('card viewing uses appearance rather than acquisition, and respects gesture, mute and disposal',async()=>{
 const originals=new Map(['window','document','fetch','localStorage'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const handlers=new Map();let saved='on',plays=0;const downloaded=[];
 const document={hidden:false,addEventListener(t,f){if(!handlers.has(t))handlers.set(t,[]);handlers.get(t).push(f);}};
 class Context{state='suspended';destination={};resume(){this.state='running';return Promise.resolve();}decodeAudioData(bytes){return Promise.resolve({file:new TextDecoder().decode(bytes)});}createGain(){return {gain:{value:1},connect(){},disconnect(){}};}createBufferSource(){return {buffer:null,connect(){},disconnect(){},stop(){},start(){assert.match(this.buffer.file,/SFX_01_Card_Appear/);plays++;}};}}
 Object.assign(globalThis,{document,window:{document,AudioContext:Context,addEventListener(){},removeEventListener(){}},fetch:async file=>{downloaded.push(file);return {ok:true,arrayBuffer:async()=>new TextEncoder().encode(file).buffer};}});
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>saved}});
 try{
  const sound=createCompletionSound();assert.equal(await sound.play(),false);for(const h of handlers.get('click'))h({isTrusted:true});await sound.prepare();assert.equal(await sound.play(),true);assert.equal(plays,1);
  saved='off';assert.equal(await sound.play(),false);assert.equal(plays,1);saved='on';document.hidden=true;assert.equal(await sound.play(),false);document.hidden=false;
  sound.play(.01);sound.stop();await new Promise(r=>setTimeout(r,20));assert.equal(plays,1);
  sound.dispose();assert.equal(await sound.play(),false);assert.equal(plays,1);assert.equal(new Set(downloaded).size,19);
 }finally{for(const [key,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
test('sound defaults to on and remembers an explicit off choice',()=>{assert.equal(completionSoundEnabled(null),true);assert.equal(completionSoundEnabled('on'),true);assert.equal(completionSoundEnabled('off'),false);});
