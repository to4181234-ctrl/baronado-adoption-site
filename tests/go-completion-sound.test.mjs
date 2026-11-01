import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompletionSound,completionSoundEnabled} from '../lib/goCompletionSound.js';

test('approved completion MP3 plays only while visible, enabled and not disposed',async()=>{
 let created=0,plays=0,pauses=0,saved=null;
 const previous={Audio:globalThis.Audio,window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage};
 globalThis.window={};
 globalThis.document={hidden:false};
 globalThis.localStorage={getItem:()=>saved};
 globalThis.Audio=class {
  constructor(src){created++;assert.match(src,/Card_Acquired\.mp3$/);this.currentTime=0;this.volume=1;}
  play(){plays++;return Promise.resolve();}
  pause(){pauses++;}
 };
 try{
  const sound=createCompletionSound();
  assert.equal(created,0,'no audio object created before user interaction');
  sound.play();assert.equal(created,1);assert.equal(plays,1);
  await sound.prepare();assert.equal(created,1);
  globalThis.document.hidden=true;sound.play();assert.equal(plays,1);
  globalThis.document.hidden=false;saved='off';sound.play();assert.equal(plays,1);
  saved='on';sound.play();assert.equal(plays,2);
  sound.dispose();assert.ok(pauses>0);sound.play();assert.equal(plays,2);
 }finally{
  for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
 }
});
test('sound defaults to on and remembers an explicit off choice',()=>{
 assert.equal(completionSoundEnabled(nu¶»§q«^