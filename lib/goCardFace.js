import {cardDate} from './goShared.js';
import {gameElement} from './goV3Game.js';
export const CARD_FACE={width:166,height:265,photo:{x:16,y:28,width:134,height:132},frame:'/figma-preview/card-frame.svg',star:'/figma-card/star.svg',badge:'/figma-card/badge-bg.svg',badgeBorder:'/figma-card/badge-border.svg'};
const ICONS={'숲':'forest','햇살':'sun','물결':'wave','별빛':'starlight','온기':'warmth','꿈결':'dream'};
const score=value=>Math.max(0,Math.min(5,Math.trunc(Number(value)||0)));
export function cardFaceModel(card){
 const element=card.battle?.element||gameElement(card.dogName);
 const key=ICONS[element]||'dream';
 return {dogName:String(card.dogName||'멍멍이'),author:String(card.nickname||'멍기록가'),date:Number.isFinite(Date.parse(card.capturedAt))?cardDate(card.capturedAt).replace(/\s/g,'').replace(/\.$/,''):'',element,power:score(card.battle?.power??card.ratings?.cuteness),charm:score(card.battle?.charm??card.ratings?.affection),badge:'/figma-card/tag-'+key+'.svg',badgeBorder:'/figma-card/tag-border.svg',icon:'/figma-card/tag-icon-'+key+'.svg'};
}
