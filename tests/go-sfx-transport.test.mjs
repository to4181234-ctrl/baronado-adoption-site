import test from 'node:test';
import assert from 'node:assert/strict';
import {createSfxTransport} from '../lib/goSfxTransport.js';
function fixture({deferDecode=false}={}){
 const listeners=new Map(),windowListeners=new Map(),started=[],stopped=[],downloads=[];let finishDecode,enabled=true,now=1000;
 const doc={hidden:false,addEventListener(t,f){if(!listeners.has(t))listeners.set(t,new Set());listeners.get(t).add(f);},removeEventListener(t,f){listeners.get(t)?.delete(f);}};
 class Context{state='suspended';destination={};resume(){this.state='running';return Promise.resolve();}decodeAudioData(){return deferDecode?new Promise(r=>{finishDecode=r;}):Promise.resolve({duration:.5});}createGain(){return {gain:{value:1},connect(){},disconnect(){}};}createBufferSource(){const s={connect(){},disconnect(){},start(){started.push(s);},stop(){stopped.push(s);}};return s;}}
 const win={document:doc,AudioContext:Context,addEventListener(t,f){if(!windowListeners.has(t))windowListeners.set(t,new Set());windowListeners.get(t).add(f);},removeEventListener(t,f){windowListeners.get(t)?.delete(f);}};
 const previous={window:globalThis.window,document:globalThis.document,fetch:globalThis.fetch};globalThis.window=win;globalThis.document=doc;globalThis.fetch=async file=>{downloads.push(file);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};};
 const audio=createSfxTransport({files:{start:'/start.mp3',appear:'/appear.mp3',victory:'/victory.mp3'},enabled:()=>enabled,clock:()=>now});
 return {audio,started,stopped,downloads,doc,gesture(){for(const f of listeners.get('click')||[])f({isTrusted:true});},hidden(){doc.hidden=true;for(const f of listeners.get('visibilitychange')||[])f();},mute(){enabled=false;for(const f of windowListeners.get('go-v3-settings-changed')||[])f();},advance(ms){now+=ms;},decode(){finishDecode?.({duration:.5});},restore(){audio.dispose();for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}};
}
test('no automatic SFX before a gesture; one context then plays selection and appearance without cutting either',async()=>{
 const f=fixture();try{assert.equal(await f.audio.play('start'),false);f.gesture();assert.equal(await f.audio.play('start'),true);assert.equal(await f.audio.play('appear'),true);assert.equal(f.started.length,2);assert.equal(f.stopped.length,0);assert.equal(f.downloads.length,3);}finally{f.restore();}
});
test('server-confirmed victory can play asynchronously after the original tap',async()=>{
 const f=fixture();try{f.gesture();await f.audio.play('start');f.audio.stop();f.advance(3000);assert.equal(await f.audio.play('victory'),true);assert.equal(f.started.length,2);}finally{f.restore();}
});
test('stop during decoding cancels the stale sound rather than playing it after leaving a screen',async()=>{
 const f=fixture({deferDecode:true});try{f.gesture();const playing=f.audio.play('victory');await new Promise(resolve=>setImmediate(resolve));f.audio.stop();f.decode();assert.equal(await playing,false);assert.equal(f.started.length,0);}finally{f.restore();}
});
test('mute stops all active sounds; hidden and disposed players cannot replay old cues',async()=>{
 const f=fixture();try{f.gesture();await f.audio.play('start');await f.audio.play('appear');f.mute();assert.equal(f.stopped.length,2);f.advance(3000);assert.equal(await f.audio.play('victory'),false);f.hidden();assert.equal(await f.audio.play('victory'),false);f.audio.dispose();assert.equal(await f.audio.play('victory'),false);}finally{f.restore();}
});
test('stopping cancels scheduled cues and duplicate rapid taps are ignored',async()=>{
 const f=fixture();try{f.gesture();assert.equal(await f.audio.play('start'),true);assert.equal(await f.audio.play('start'),false);f.audio.schedule('victory',5);f.audio.stop();await new Promise(r=>setTimeout(r,15));assert.equal(f.started.length,1);}finally{f.restore();}
});
