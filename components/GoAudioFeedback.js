'use client';
import {useEffect} from 'react';
import {createGameAudio} from '../lib/goV3Audio.js';

// Root ownership lets navigation clicks finish sounding after the source page unmounts.
export default function GoAudioFeedback(){
 useEffect(()=>{
  const audio=createGameAudio();
  function click(event){
   const target=event.target?.closest?.('button,a[href],[role="button"],input[type="checkbox"],input[type="radio"],select');
   if(!target||target.disabled||target.getAttribute('aria-disabled')==='true')return;
   if(!target.closest('.v3-go-site,.v3-discovery-figma,.v3-camera-backdrop,.go-completion-screen'))return;
   // These controls already own a specific, timed cue.
   if(target.closest('.v3-collars,.meong-battle-card,.meong-battle-chosen,.v3-interact-dog,.v3-machine-action,.v3-camera-shutter,.go-inline-reveal'))return;
   if(target.matches('.meong-battle-start-link'))return;
   if(/소리 끄기|음원 끄기|사운드 켜기\/끄기/.test(target.getAttribute('aria-label')||''))return;
   void audio.play(target.closest('.v6-public-item,.v5-card-grid')?'appear':'select');
  }
  document.addEventListener('click',click,true);
  return()=>{document.removeEventListener('click',click,true);audio.dispose();};
 },[]);
 return null;
}
