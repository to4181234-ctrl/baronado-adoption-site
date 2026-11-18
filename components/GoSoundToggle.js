'use client';
import {useEffect,useState} from 'react';
import {audioEnabled,GAME_SOUND_KEY,listenAudioSetting,notifyAudioSettingChanged} from '../lib/goV3Audio.js';

/** One saved audio preference shared by every MeongGO view. */
export default function GoSoundToggle({className=''}){
 const [enabled,setEnabled]=useState(true);
 useEffect(()=>listenAudioSetting(setEnabled),[]);
 function toggle(){
  const next=!audioEnabled();
  try{
   localStorage.setItem(GAME_SOUND_KEY,next?'on':'off');
   notifyAudioSettingChanged();
  }catch{
   // Keep the old setting; never pretend a failed preference change succeeded.
  }
 }
 return <button className={`${className} go-audio-toggle`} type="button" onClick={toggle}
  aria-label={enabled?'소리 끄기':'소리 켜기'} aria-pressed={enabled}>
  <img src={`/figma-v3/sound-${enabled?'on':'off'}.png`} alt="" aria-hidden="true"/>
 </button>;
}
