'use client';
import {useEffect,useRef,useState} from 'react';

export default function ZoomablePhoto({src,alt,onSwipe}){
 const [scale,setScale]=useState(1),[offset,setOffset]=useState({x:0,y:0});
 const touch=useRef(null),pointer=useRef(null),frame=useRef(null);
 useEffect(()=>{setScale(1);setOffset({x:0,y:0});touch.current=null;pointer.current=null},[src]);
 const limit=(value,nextScale)=>{
  const rect=frame.current?.getBoundingClientRect();
  if(!rect)return value;
  const maxX=Math.max(0,(nextScale-1)*rect.width/2),maxY=Math.max(0,(nextScale-1)*rect.height/2);
  return {x:Math.min(maxX,Math.max(-maxX,value.x)),y:Math.min(maxY,Math.max(-maxY,value.y))};
 };
 function onStart(e){e.stopPropagation();
  if(e.touches.length===2){const [a,b]=e.touches;touch.current={mode:'pinch',distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),scale,offset,center:{x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2}};return}
  if(e.touches.length===1){const a=e.touches[0];touch.current={mode:'drag',x:a.clientX,y:a.clientY,offset,scale}}
 }
 function onMove(e){if(!touch.current)return;e.stopPropagation();
  if(e.touches.length===2){e.preventDefault();const [a,b]=e.touches;const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);const v=touch.current;
   if(v.mode!=='pinch'||!v.distance){touch.current={mode:'pinch',distance:d,scale,offset};return}
   const next=Math.min(4,Math.max(1,v.scale*d/v.distance));setScale(next);setOffset(limit(v.offset,next));return}
  if(e.touches.length===1&&touch.current.mode==='drag'&&scale>1){e.preventDefault();const v=touch.current;setOffset(limit({x:v.offset.x+e.touches[0].clientX-v.x,y:v.offset.y+e.touches[0].clientY-v.y},scale))}
 }
 function onEnd(e){e.stopPropagation();const v=touch.current;if(!v)return;
  if(v.mode==='drag'&&v.scale===1&&e.changedTouches.length){const distance=e.changedTouches[0].clientX-v.x;if(Math.abs(distance)>35)onSwipe?.(distance<0?1:-1)}
  touch.current=null;
  if(scale<=1){setScale(1);setOffset({x:0,y:0})}
 }
 return <div ref={frame} className="v3-zoom-photo" onClick={e=>e.stopPropagation()} onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} onTouchCancel={()=>{touch.current=null}} onPointerDown={e=>{if(e.pointerType!=='touch')pointer.current={x:e.clientX}}} onPointerUp={e=>{if(e.pointerType!=='touch'&&pointer.current&&scale===1){const dx=e.clientX-pointer.current.x;if(Math.abs(dx)>35)onSwipe?.(dx<0?1:-1)}pointer.current=null}}>
  <img src={src} alt={alt} draggable="false" style={{transform:`translate(${offset.x}px, ${offset.y}px) scale(${scale})`}}/>
 </div>;
}
