'use client';
import {useEffect,useRef,useState} from 'react';
import GoCompletion from './GoCompletion.js';
import GoSoundButton from './GoSoundButton.js';
import {createCompletionSound,COMPLETION_SOUND_KEY,completionSoundEnabled} from '../lib/goCompletionSound.js';
export default function GoCardViewer({card,onClose,preparedSound,onOpenPost}){
 const [enabled,setEnabled]=useState(true);const player=useRef(null),on=useRef(true),request=useRef(0);
 useEffect(()=>{const audio=preparedSound||createCompletionSound();player.current=audio;try{on.current=completionSoundEnabled(localStorage.getItem(COMPLETION_SOUND_KEY));}catch{}setEnabled(on.current);if(on.current)replay();return()=>{request.current++;audio.dispose();player.current=null;};},[]);
 function replay(){const id=++request.current;const started=performance.now();player.current?.stop();if(!on.current)return;const delay=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:.3;Promise.resolve(player.current?.prepare()).then(()=>{const elapsed=(performance.now()-started)/1000;if(id===request.current&&on.current&&elapsed<.5)player.current?.play(Math.max(0,delay-elapsed));});}
 function toggle(){on.current=!on.current;setEnabled(on.current);try{localStorage.setItem(COMPLETION_SOUND_KEY,on.current?'on':'off');}catch{}if(on.current)player.current?.prepare();else{request.current++;player.current?.stop();}}
 return <GoCompletion card={card} viewOnly soundButton={<GoSoundButton enabled={enabled} onClick={toggle}/>} onReplay={replay} onDone={onClose} onOpenPost={onOpenPost}/>;
}
