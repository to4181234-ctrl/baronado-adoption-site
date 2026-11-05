'use client';
import {useEffect,useRef,useState} from 'react';
import {createGameAudio} from '../lib/goV3Audio.js';
import GoElementSparkles,{elementForCard} from './GoElementSparkles.js';
export default function GoReveal({children,card,initialCue='appear'}){
 const [version,setVersion]=useState(0),audio=useRef(null);
 useEffect(()=>{audio.current=createGameAudio();if(initialCue)audio.current.play(initialCue);return()=>audio.current?.dispose();},[]);
 function replay(){setVersion(v=>v+1);audio.current?.play('appear');}
 return <div className="go-inline-reveal" role="button" tabIndex={0} aria-label="카드 효과 다시 재생" onClick={replay} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();replay();}}}><div key={version} className="go-inline-reveal-stage">{children}<GoElementSparkles element={elementForCard(card)} variant="inline"/></div></div>;
}
