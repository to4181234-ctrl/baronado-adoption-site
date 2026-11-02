'use client';
import {useId} from 'react';
import {CARD_FACE,cardFaceModel} from '../lib/goCardFace.js';
/** Shared Figma card face for lists, detail, battle and exported PNG coordinates. */
export default function GoCardFace({card}){
 const model=cardFaceModel(card),id=useId().replaceAll(':','');
 return <svg className="go-card-graphic" viewBox="0 0 166 265" role="img" aria-label={`${model.dogName} 카드 · 파워 ${model.power} · 애교 ${model.charm} · ${model.element} · ${model.author}`}>
  <defs><clipPath id={id+'name'}><rect x="16" y="166" width="94" height="23"/></clipPath><clipPath id={id+'author'}><rect x="10" y="237" width="84" height="14"/></clipPath></defs>
  <image href={CARD_FACE.frame} x="0" y="0" width="166" height="265"/>
  <g fontFamily="MonaS12, sans-serif" fill="#000">
   <text x="10" y="21" fontSize="7">MEONG MEONG GO!</text>
   <image href={card.imageUrl} {...CARD_FACE.photo} preserveAspectRatio="xMidYMid slice"/>
   <text x="16" y="181.324" fontSize="12.324" fontWeight="700" clipPath={'url(#'+id+'name)'}>{model.dogName}</text>
   <image href={CARD_FACE.badge} x="112" y="169" width="38" height="14.63"/>
   <image href={CARD_FACE.badgeBorder} x="112.73" y="169.73" width="36.54" height="13.17"/>
   <image href={model.icon} x="115.65" y="171.92" width="8.77" height="8.77"/>
   <text x="132.5" y="179" fontSize="7" textAnchor="middle">{model.element}</text>
   {[['파워',model.power,198],['애교',model.charm,217]].map(([label,value,y])=><g key={label}><text x="16" y={y+10} fontSize="10">{label}</text>{Array.from({length:value},(_,i)=><image key={i} href={CARD_FACE.star} x={40+i*13.4} y={y} width="11.36" height="10.32"/>)}</g>)}
   <text x="10" y="247" fontSize="7" clipPath={'url(#'+id+'author)'}>{model.author}</text>
   <text x="150" y="247" fontSize="7" textAnchor="end">{model.date}</text>
  </g>
 </svg>;
}
