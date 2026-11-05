'use client';
import {ELEMENTS,gameElement} from '../lib/goV3Game.js';
import './GoElementSparkles.css';

// Reuse the six Figma pixel-attribute icons already displayed on card faces.
const ICONS={
 '햇살':'sun','숲':'forest','물결':'wave',
 '별빛':'starlight','온기':'warmth','꿈결':'dream'
};
export function elementForCard(card){
 const found=card?.battle?.element||gameElement(card?.dogName);
 return ELEMENTS.includes(found)?found:'꿈결';
}
export function postSparkleSrc(position,card){
 const key=ICONS[elementForCard(card)]||'dream';
 return key==='sun'?'/figma-post/sparkle-'+position+'.svg':
  '/figma-post/effects/sparkle-'+position+'-'+key+'.svg';
}

// Eight stable positions; only the Figma-icon images and their pixel-scale change.
// Each burst ends automatically so the card remains the visual focus.
const PARTICLES=[
 {left:'18%',top:'30%',size:27,delay:60},
 {left:'81%',top:'20%',size:36,delay:140},
 {left:'91%',top:'56%',size:23,delay:85},
 {left:'76%',top:'83%',size:28,delay:195},
 {left:'24%',top:'79%',size:31,delay:120},
 {left:'9%',top:'58%',size:21,delay:170},
 {left:'50%',top:'10%',size:19,delay:240},
 {left:'51%',top:'91%',size:19,delay:225}
];
export default function GoElementSparkles({element='꿈결',secondElement=null,variant='inline'}){
 const first=ICONS[element]||'dream',second=ICONS[secondElement]||null;
 return <span className={'go-element-sparkles is-'+variant} aria-hidden="true">
  {PARTICLES.map((p,i)=><img key={i}
    src={'/figma-card/tag-icon-'+(second&&i%2?second:first)+'.svg'}
    alt="" draggable="false"
    style={{left:p.left,top:p.top,width:p.size+'px',height:p.size+'px',animationDelay:p.delay+'ms'}}
   />)}
 </span>;
}
