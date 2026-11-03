// Gain correction preserves the approved original MP3 bytes.
// Measured sources: album -39.0 dB mean, camera -34.7 dB, acquired -21.6 dB.
export function gameAudioGain(file=''){
 if(/SFX_(20|21|22|23)_/.test(file))return 1;
 if(file.endsWith('BGM_02_Album_Original_Chiptune_Loop.mp3'))return 8;
 if(file.endsWith('BGM_03_Camera_Original_Suspense_Loop.mp3'))return 5;
 if(file.endsWith('SFX_19_Card_Acquired.mp3'))return 2.2;
 if(/SFX_(12|13|14|15|16|17|18)_/.test(file))return 3;
 if(/SFX_(10|11)_/.test(file))return 2;
 return 1;
}
let context=null;
const connections=new WeakMap();
export function prepareAudioGain(audio){
 if(typeof window==='undefined')return;
 try{
  const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
  context||=new AudioContext();
  if(!connections.has(audio)){
   const source=context.createMediaElementSource(audio),gain=context.createGain();gain.gain.value=gameAudioGain(audio.src);
   source.connect(gain);gain.connect(context.destination);connections.set(audio,{source,gain});
  }
  context.resume().catch(()=>{});
 }catch{ /* Older browsers retain ordinary HTML audio volume. */ }
}
export function releaseAudioGain(audio){
 const nodes=connections.get(audio);if(!nodes)return;
 nodes.source.disconnect();nodes.gain.disconnect();connections.delete(audio);
}
