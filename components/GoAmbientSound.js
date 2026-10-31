'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {audioEnabled,albumMusicFile,cameraMusicFile} from '../lib/goV3Audio.js';

// Exactly one BGM element; it survives transitions inside MeongGO.
// Never starts merely because a page rendered or loaded.
let player=null,mode='album',activated=false;
function music(){if(!player){player=new Audio(albumMusicFile);player.loop=true;player.volume=.20;}return player;}
function pause(){player?.pause();}
function switchTo(next){mode=next==='camera'?'camera':'album';const node=music(),src=mode==='camera'?cameraMusicFile:albumMusicFile;if(!node.src.endsWith(src)){node.pause();node.src=src;node.load();}if(activated&&audioEnabled()&&!document.hidden)node.play().catch(()=>{});}
export default function GoAmbientSound(){
 const pathname=usePathname();
 useEffect(()=>{
  const allowed=pathname?.startsWith('/go')&&!pathname.startsWith('/go/battle')&&!pathname.startsWith('/go/community')&&!pathname.startsWith('/go/settings')&&!pathname.startsWith('/go/profile')&&!pathname.startsWith('/go/avatar')&&!pathname.startsWith('/go/recorders');
  if(!allowed){pause();return;}
  // Album/interaction page: only an explicit in-page gesture unlocks the album loop.
  function gesture(e){
   if(!e.target?.closest?.('.v3-go-app')||e.target.closest('a[href^="/go/"]')||e.target.closest('.v3-camera-close'))return;
   if(!audioEnabled())return;
   activated=true;switchTo(mode);
  }
  function change(e){if(e?.detail==='stop'){pause();mode='album';return;}if(e?.detail==='camera'||e?.detail==='calm'){if(e.detail==='camera')activated=true;switchTo(e.detail);}}
  function settings(){if(!audioEnabled())pause();else if(activated&&!document.hidden)music().play().catch(()=>{});}
  function visibility(){if(document.hidden)pause();else settings();}
  document.addEventListener('pointerdown',gesture,{passive:true});
  document.addEventListener('keydown',gesture);
  document.addEventListener('visibilitychange',visibility);
  window.addEventListener('go-v3-music',change);
  window.addEventListener('go-v3-settings-changed',settings);
  return()=>{document.removeEventListener('pointerdown',gesture);document.removeEventListener('keydown',gesture);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('go-v3-music',change);window.removeEventListener('go-v3-settings-changed',settings);pause();};
 },[pathname]);
 return null;
}
