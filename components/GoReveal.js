'use client';
import {useEffect,useRef,useState} from 'react';
import {createGameAudio} from '../lib/goV3Audio.js';
export default function GoReveal({children,initialCue='appear'}){
 const [version,setVersion]=useState(0),audio=useRef(null);
 useEffect(()=>{audio.current=createGameAudio();if(initialCue)audio.current.play(initialCue);return()=>audio.current?.dispose();},[]);
 function replay(){setVersion(v=>v+1);audio.current?.play('appear');}
 return <div className="go-inline-reveal" role="button" tabIndex={0} aria-label="카드 효과 다시 재생" onClick={replay} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();replay();}}}><div key={version} className="go-inline-reveal-stage"><span className="go-inline-flash" aria-hidden="true"/>{children}{Array.from({length:8},(_,i)=><span key={i} className="go-inline-spark" style={{'--spark-angle':(i*45)+'deg','--spark-delay':(i%3*.06)+'s'}} aria-hidden="true">✦</span>)}</div></div>;
}
