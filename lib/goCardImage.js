import { cardDate } from './goShared.js';
import { RATING_TRAITS } from './goRatings.js';
const FONT='-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
export function wrapCanvasText(ctx,text,width,maxLines=20){
 const result=[];let line='';
 for(const char of Array.from(String(text||''))){
  if(char==='\n'){result.push(line);line='';continue;}
  if(line&&ctx.measureText(line+char).width>width){result.push(line);line=char;}else line+=char;
 }
 if(line||!result.length)result.push(line);
 if(result.length>maxLines){const clipped=result.slice(0,maxLines);let last=clipped[maxLines-1];while(last&&ctx.measureText(last+'…').width>width)last=Array.from(last).slice(0,-1).join('');clipped[maxLines-1]=last+'…';return clipped;}
 return result;
}
function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function star(ctx,x,y,size,filled){ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?size*.43:size;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);}ctx.closePath();ctx.strokeStyle='#caa45e';ctx.lineWidth=2;if(filled){ctx.fillStyle='#caa45e';ctx.fill();}ctx.stroke();}
export async function buildCardImage(card,photoBlob){
 if(document.fonts?.ready)await document.fonts.ready;
 const sourceUrl=URL.createObjectURL(photoBlob);
 try{
  const photo=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('사진을 읽지 못했어요.'));image.src=sourceUrl;});
  const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');if(!ctx)throw new Error('이미지를 만들 수 없는 브라우저예요.');
  const width=1080,x=64,contentWidth=width-x*2,photoY=88,photoBottom=photoY+contentWidth;
  ctx.font=`600 34px ${FONT}`;const title=wrapCanvasText(ctx,card.title,contentWidth,5);
  ctx.font=`400 32px ${FONT}`;const description=wrapCanvasText(ctx,card.description,contentWidth,14);
  const recordedTraits=RATING_TRAITS.filter(t=>card.ratings?.[t.key]!=null);
  const hasRatings=recordedTraits.length>0;
  const nameY=photoBottom+65,titleY=nameY+51,descriptionY=titleY+title.length*47+17;
  const ratingsY=descriptionY+description.length*46+26,footerY=ratingsY+(hasRatings?16+43*recordedTraits.length:0)+46,height=footerY+60;
  canvas.width=width;canvas.height=height;ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);rounded(ctx,24,16,width-48,height-32,22);ctx.strokeStyle='#dcd2c3';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#87735a';ctx.font=`600 23px ${FONT}`;ctx.fillText('MEONG MEONG GO!',x,59);
  ctx.save();rounded(ctx,x,photoY,contentWidth,contentWidth,12);ctx.clip();ctx.fillStyle='#f7f4ef';ctx.fillRect(x,photoY,contentWidth,contentWidth);const side=Math.min(photo.naturalWidth,photo.naturalHeight);ctx.drawImage(photo,(photo.naturalWidth-side)/2,(photo.naturalHeight-side)/2,side,side,x,photoY,contentWidth,contentWidth);ctx.restore();
  ctx.fillStyle='#493521';ctx.font=`750 50px ${FONT}`;ctx.fillText(card.dogName,x,nameY);
  ctx.font=`600 34px ${FONT}`;title.forEach((line,i)=>ctx.fillText(line,x,titleY+i*47));
  ctx.font=`400 32px ${FONT}`;ctx.fillStyle='#8d775b';description.forEach((line,i)=>ctx.fillText(line,x,descriptionY+i*46));
  if(hasRatings){ctx.strokeStyle='#ebe0cf';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,ratingsY-12);ctx.lineTo(width-x,ratingsY-12);ctx.stroke();recordedTraits.forEach((trait,i)=>{const y=ratingsY+26+i*43;ctx.font=`400 28px ${FONT}`;ctx.fillStyle='#a38a67';ctx.fillText(trait.label,x,y+7);const score=card.ratings?.[trait.key];for(let j=1;j<=5;j++)star(ctx,x+180+(j-1)*43,y-3,15,j<=score);});}
  ctx.strokeStyle='#ebe0cf';ctx.beginPath();ctx.moveTo(x,footerY-38);ctx.lineTo(width-x,footerY-38);ctx.stroke();ctx.font=`400 25px ${FONT}`;ctx.fillStyle='#a68d6e';ctx.fillText(cardDate(card.capturedAt),x,footerY);ctx.textAlign='right';ctx.fillText(card.nickname,width-x,footerY);ctx.textAlign='left';
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('이미지 저장을 준비하지 못했어요.');
  const name=String(card.dogName||'멍멍이').replace(/[^\p{L}\p{N}_-]/gu,'').slice(0,30);
  return new File([blob],`멍멍GO-${name}.png`,{type:'image/png'});
 }finally{URL.revokeObjectURL(sourceUrl);}
}
