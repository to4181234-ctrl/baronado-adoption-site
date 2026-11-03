// One gesture-unlocked Web Audio context; original supplied MP3 buffers only.
const runtimes=new WeakMap();
function runtimeFor(win){
 if(runtimes.has(win))return runtimes.get(win);
 const doc=win.document||document,rt={context:null,unlocked:false,raw:new Map(),decoded:new Map(),clients:new Set()};
 function context(){if(!rt.context){const C=win.AudioContext||win.webkitAudioContext;if(C)rt.context=new C();}return rt.context;}
 rt.buffer=async file=>{
  if(!rt.raw.has(file)){const request=fetch(file,{cache:'force-cache'}).then(r=>r.ok?r.arrayBuffer():null).catch(()=>null);rt.raw.set(file,request);}
  const ctx=context();if(!ctx)return null;
  if(!rt.decoded.has(file))rt.decoded.set(file,rt.raw.get(file).then(bytes=>bytes?ctx.decodeAudioData(bytes.slice(0)):null).catch(()=>null));
  return rt.decoded.get(file);
 };
 rt.prefetch=file=>{if(!rt.raw.has(file))rt.raw.set(file,fetch(file,{cache:'force-cache'}).then(r=>r.ok?r.arrayBuffer():null).catch(()=>null));if(rt.unlocked)rt.buffer(file);};
 const gesture=event=>{if(event.isTrusted===false)return;rt.unlocked=true;const ctx=context();ctx?.resume().catch(()=>{});for(const file of rt.raw.keys())rt.buffer(file);};
 for(const type of ['pointerdown','touchend','click','keydown'])doc.addEventListener(type,gesture,{capture:true,passive:true});
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)for(const client of rt.clients)client.stop();});
 rt.contextFor=context;runtimes.set(win,rt);return rt;
}
export function createSfxTransport({files,enabled,gainForFile=()=>1,clock=Date.now}){
 if(typeof window==='undefined')return {play:async()=>false,preload:()=>{},schedule:()=>null,stop:()=>{},dispose:()=>{}};
 const rt=runtimeFor(window),doc=window.document||document,active=new Map(),timers=new Set(),last=new Map();let disposed=false,epoch=0;
 function preload(){for(const file of Object.values(files))rt.prefetch(file);}
 function release(source){const gain=active.get(source);if(!gain)return;active.delete(source);try{source.disconnect();gain.disconnect();}catch{}}
 function stop(){epoch++;for(const timer of timers)clearTimeout(timer);timers.clear();for(const [source,gain] of active){try{source.stop();source.disconnect();gain.disconnect();}catch{}}active.clear();}
 async function play(name){
  if(disposed||doc.hidden||!enabled()||!rt.unlocked||!files[name])return false;
  const started=clock(),token=epoch;if(started-(last.get(name)??-Infinity)<180)return false;last.set(name,started);
  const buffer=await rt.buffer(files[name]);
  if(!buffer||disposed||token!==epoch||doc.hidden||!enabled()||clock()-started>1000)return false;
  const ctx=rt.contextFor();if(ctx.state!=='running')return false;
  if(active.size>=8){const oldest=active.keys().next().value;try{oldest.stop();}catch{}release(oldest);}
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=gainForFile(files[name]);source.connect(gain);gain.connect(ctx.destination);active.set(source,gain);source.onended=()=>release(source);source.start();if(window.location&&new URLSearchParams(window.location.search).has('audioDebug'))console.debug('[MeongGO audio] '+name+' started');return true;
 }
 function schedule(name,delay){if(disposed)return null;const timer=setTimeout(()=>{timers.delete(timer);void play(name);},Math.max(0,delay));timers.add(timer);return timer;}
 const setting=()=>{if(!enabled())stop();};window.addEventListener('go-v3-settings-changed',setting);window.addEventListener('storage',setting);
 const client={play,preload,schedule,stop,dispose(){disposed=true;stop();rt.clients.delete(client);window.removeEventListener('go-v3-settings-changed',setting);window.removeEventListener('storage',setting);}};
 rt.clients.add(client);preload();return client;
}
