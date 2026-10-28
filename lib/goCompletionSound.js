// Only requested from the camera when the visitor opts in. No audio blocks saving.
export const COMPLETION_SOUND_KEY='baronado-go-completion-sound';
export function createCompletionSound(){
 let context=null,buffer=null,pending=null,disposed=false,source=null;
 function prepare(){try{if(disposed)return Promise.resolve();const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return Promise.resolve();context ||= new Audio();const resume=context.resume();resume?.catch(()=>{});if(buffer)return Promise.resolve();if(!pending)pending=fetch('/go-card-woof.mp3',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error();return r.arrayBuffer();}).then(bytes=>context.decodeAudioData(bytes)).then(decoded=>{if(!disposed)buffer=decoded;}).catch(()=>{}).finally(()=>{pending=null;});return pending;}catch{return Promise.resolve();}}
 function play(){try{if(disposed||!buffer||context?.state!=='running'||document.visibilityState!=='visible')return;source?.stop();source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);source.start();}catch{}}
 function stop(){try{source?.stop();}catch{}source=null;}
 function dispose(){disposed=true;stop();context?.close().catch(()=>{});}
 return {prepare,play,stop,dispose};
}
