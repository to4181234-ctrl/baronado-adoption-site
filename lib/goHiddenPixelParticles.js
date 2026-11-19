/**
 * HIDDEN-only retro pixel sparkles (no external images or animation assets).
 * B diamond 45%, C holographic color 35%, A small cross 20%.
 * All geometry uses an integer 17x17 grid so pixels stay sharp on mobile.
 */
export const HIDDEN_PARTICLE_COUNTS=Object.freeze({diamond:18,color:14,cross:8});
export const HIDDEN_PARTICLE_TOTAL=40;

function spritePaths(kind){
 const size=17;
 const pixels=Array.from({length:size},()=>Array(size).fill(0));
 const put=(x,y,tone)=>{if(x>=0&&x<size&&y>=0&&y<size)pixels[y][x]=tone;};
 if(kind==='diamond'){
  for(let y=3;y<=13;y++)for(let x=3;x<=13;x++){
   const d=Math.abs(x-8)+Math.abs(y-8);
   if(d<=5)put(x,y,d>=4?1:d>=2?2:3);
  }
  for(let n=0;n<17;n++)if(n<3||n>13){
   put(8,n,2);put(n,8,2);
  }
  [[2,3],[14,2],[3,14],[14,13]].forEach(([x,y])=>put(x,y,1));
 }else if(kind==='color'){
  for(let y=4;y<=12;y++)for(let x=4;x<=12;x++){
   const d=Math.abs(x-8)+Math.abs(y-8);
   if(d<=4)put(x,y,d>=3?1:d>=2?2:3);
  }
  for(let n=1;n<=15;n++)if(n<=3||n>=13){
   put(8,n,2);put(n,8,2);
  }
  for(let n=5;n<=11;n++){put(8,n,3);put(n,8,3);}
  [[2,2],[14,3],[3,14],[14,14]].forEach(([x,y])=>put(x,y,1));
 }else if(kind==='cross'){
  for(let n=2;n<=14;n++){put(8,n,n>=6&&n<=10?3:2);put(n,8,n>=6&&n<=10?3:2);}
  for(let y=7;y<=9;y++)for(let x=7;x<=9;x++)put(x,y,x===8&&y===8?3:2);
  [[5,5],[11,5],[5,11],[11,11]].forEach(([x,y])=>put(x,y,1));
 }else throw new Error('Unknown HIDDEN sparkle shape');
 return [1,2,3].map(tone=>{
  let path='';
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   if(pixels[y][x]===tone)path+=`M${x} ${y}h1v1h-1Z`;
  }
  return path;
 });
}
export const HIDDEN_PIXEL_SPRITES=Object.freeze({
 diamond:spritePaths('diamond'),
 color:spritePaths('color'),
 cross:spritePaths('cross')
});
const types=[...Array.from({length:7},()=>['diamond','color','diamond','cross','color']).flat(),'diamond','diamond','diamond','diamond','cross'];
const palettes=Object.freeze({
 diamond:[['#D59000','#FFD525','#FFFCBE']],
 cross:[['#E2A20D','#FFE05B','#FFF8CA']],
 color:[
  ['#C9159E','#FB4CC8','#FFE0FF'],
  ['#087EA7','#3DE6E6','#E4FFFE'],
  ['#7139CA','#B67BFF','#F6DEFF'],
  ['#CF8E06','#FFDA2D','#FFFCBE']
 ]
});
export const HIDDEN_PIXEL_PARTICLES=Object.freeze(Array.from({length:HIDDEN_PARTICLE_TOTAL},(_,i)=>{
 const type=types[(i*17)%HIDDEN_PARTICLE_TOTAL];
 const palette=palettes[type][type==='color'?i%4:0];
 return Object.freeze({
  id:i,
  type,
  colors:palette,
  angle:((i*137.507764+24)%360).toFixed(2)+'deg',
  distance:(type==='diamond'?126+(i%6)*9:type==='color'?119+(i%5)*10:130+(i%4)*8)+'px',
  size:(type==='diamond'?32+(i%4)*5:type==='color'?27+(i%4)*4:18+(i%3)*3)+'px',
  delay:(type==='diamond'?610+(i%4)*45:type==='color'?790+(i%4)*55:1020+(i%3)*45)+'ms'
 });
}));
