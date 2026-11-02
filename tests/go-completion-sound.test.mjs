import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompletionSound,completionSoundEnabled} from '../lib/goCompletionSound.js';

test('approved audio plays once per request and respects off, hidden and disposal states', async()=>{
 const keys=['document','window','Audio','localStorage'];
 const originals=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 let plays=0,created=0,saved='off';
 Object.assign(globalThis,{document:{hidden:false},window:{},Audio:class {
  constructor(src){created++;assert.match(src,/SFX_19_Card_Acquired\.mp3$/);}
  pause(){} play(){plays++;return Promise.resolve();}
 }});
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>saved}});
 try {
  const sound=createCompletionSound();sound.play();assert.equal(created,0);
  saved='on';await sound.prepare();await sound.prepare();assert.equal(created,1);
  sound.play();assert.equal(plays,1);
  document.hidden=true;sound.play();assert.equal(plays,1);
  document.hidden=false;
  const delayed=sound.play(.01);saved='off';await delayed;assert.equal(plays,1);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('Storage denied');}});
  assert.doesNotThrow(()=>sound.play());assert.equal(plays,2);
  sound.dispose();sound.play();assert.equal(plays,2);
 } finally {for(const key of keys){const original=originals.get(key);if(original)Object.defineProperty(globalThis,key,original);else delete globalThis[key];}}
});
test('sound defaults to on and remembers an explicit off choice',()=>{
 assert.equal(completionSoundEnabled(null),true);assert.equal(completionSoundEnabled('on'),true);assert.equal(completionSoundEnabled('off'),false);
});
