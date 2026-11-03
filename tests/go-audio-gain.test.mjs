import test from 'node:test';
import assert from 'node:assert/strict';
import {gameAudioGain,prepareAudioGain,releaseAudioGain} from '../lib/goAudioGain.js';
test('quiet approved sources receive bounded gain while impact cues retain their original peak',()=>{
 assert.equal(gameAudioGain('https://site/audio/BGM_02_Album_Original_Chiptune_Loop.mp3'),8);
 assert.equal(gameAudioGain('/BGM_03_Camera_Original_Suspense_Loop.mp3'),5);
 assert.equal(gameAudioGain('/SFX_19_Card_Acquired.mp3'),2.2);
 assert.equal(gameAudioGain('/SFX_06_Battle_Impact.mp3'),1);
 // Resulting music peaks stay below full scale at the configured volume.
 assert.ok(-21.4+20*Math.log10(8*.48)<-1);
 assert.ok(-21.5+20*Math.log10(5*.48)<-1);
 assert.ok(-16.7+20*Math.log10(2.2)<-1);
});
test('media sources connect once, resume after a gesture, and disconnect on disposal',()=>{
 const previous=globalThis.window,events=[];
 class AudioContext{destination={};createMediaElementSource(){events.push('source');return {connect(){},disconnect(){events.push('source-disconnect');}};}createGain(){return {gain:{value:1},connect(){},disconnect(){events.push('gain-disconnect');}};}resume(){events.push('resume');return Promise.resolve();}}
 globalThis.window={AudioContext};
 try{const audio={src:'/SFX_19_Card_Acquired.mp3'};prepareAudioGain(audio);prepareAudioGain(audio);releaseAudioGain(audio);releaseAudioGain(audio);assert.deepEqual(events,['source','resume','resume','source-disconnect','gain-disconnect']);}finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});
