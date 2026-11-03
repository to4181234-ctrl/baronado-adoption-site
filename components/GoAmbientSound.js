'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {createMusicLoop} from '../lib/goV3Audio.js';
import {goMusicPlaylist} from '../lib/goMusicCatalog.js';
// One route-owned BGM. Camera events temporarily replace it without overlapping loops.
export default function GoAmbientSound(){
 const pathname=usePathname();
 useEffect(()=>{
  const allowed=pathname?.startsWith('/go')&&!['/go/battle','/go/settings','/go/profile','/go/avatar','/go/withdraw'].some(p=>pathname.startsWith(p));
  if(!allowed)return;
  let player=null,mode='album';
  function changeMode(next){mode=next;player?.dispose();player=createMusicLoop(goMusicPlaylist(mode));player.play();}
  function change(event){if(event.detail==='stop'){player?.stop();return;}if(event.detail==='camera'||event.detail==='calm')changeMode(event.detail==='camera'?'camera':'album');}
  changeMode('album');
  window.addEventListener('go-v3-music',change);
  return()=>{player?.dispose();window.removeEventListener('go-v3-music',change);};
 },[pathname]);
 return null;
}
