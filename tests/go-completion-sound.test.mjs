import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompletionSound} from '../lib/goCompletionSound.js';
test('completion sound does not fetch before opting in and never waits to play if unavailable',async()=>{
 let requests=0,plays=0;const originalFetch=globalThis.fetch;
 globalThis.document={visibilityState:'visible'};
 globalThis.window={AudioContext:class {state='running';resume(){return Promise.resolve();}close(){return Promise.resolve();}decodeAudioData(){return Promise.resolve({});}createBufferSource(){return {connect(){},start(){plays++;},stop(){}};}}};
 globalThis.fetch=async()=>{requests++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}};
 try{const sound=createCompletionSound();sound.play();assert.equal(requests,0);assert.equal(plays,0);await sound.prepare();await sound.prepare();assert.equal(requests,1);sound.play();assert.equal(plays,1);document.visibilityState='hidden';sound.play();assert.equal(plays,1);sound.dispose();document.visibilityState='visible';sound.play();assert.equal(plays,1);}finally{globalThis.fetch=originalFetch;delete globalThis.window;delete globalThis.document;}
});
