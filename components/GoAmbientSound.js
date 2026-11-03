'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {createMusicLoop} from '../lib/goV3Audio.js';
import {goMusicFile} from '../lib/goMusicCatalog.js';
// One route-owned player; unavailable selected tracks stay silent, without requesting missing files.
export default function GoAmbientSound(){
 const pathname=usePathname();
 useEffect(()=>{
  const allowed=pathname?.startsWith('/go')&&!['/go/battle','/go/settings','/go/profile','/go/avatar','/go/withdraw'].some(p=>pathname.startsWith(p));
  if(!allowed)return;
  let player=null,mode='album',activated=false;
  function changeMode(next){mode=next;player?.dispose();player=createMusicLoop(goMusicFile(mode));if(activated)player.play();}
  function gesture(){activated=true;if(!player)changeMode(mode);else player.play();}
  function change(event){if(event.detail==='stop'){player?.stop();return;}if(event.detail==='camera'||event.detail==='calm')changeMode(event.detail==='camera'?'camera':'album');}
  document.addEventListener('click',gesture,{passive:true});document.addEventListener('keydown',gesture);
  window.addEventListener('go-v3-music',change);
  return()=>{player?.dispose();document.removeEventListener('click',gesture);document.removeEventListener('keydown',gesture);window.removeEventListener('go-v3-music',change);};
 },[pathname]);
 return null;
}
