import {CARD_FACE,cardFaceModel} from './goCardFace.js';
// Kept for existing consumers: Unicode-safe wrapping is also useful outside cards.
export function wrapCanvasText(ctx,text,width,maxLines=20){
 const lines=[];let line='';for(const ch of Array.from(String(text||''))){if(ch==='\n'){lines.push(line);line='';}else if(line&&ctx.measureText(line+ch).width>width){lines.push(line);line=ch;}else line+=ch;}if(line||!lines.length)lines.push(line);
 if(lines.length<=maxLines)return lines;const out=lines.slice(0,maxLines);let last=out.at(-1);while(last&&ctx.measureText(last+'…').width>width)last=Array.from(last).slice(0,-1).join('');out[maxLines-1]=last+'…';return out;
}
const loadImage=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('카드 이미지 소스를 읽지 못했어요.'));img.src=src;});
export async function buildCardImage(card,photoBlob){
 await Promise.all([document.fonts.load('400 14px MonaS12'),document.fonts.load('700 14px MonaS12')]);await document.fonts.ready;
 const model=cardFaceModel(card),photoURL=URL.createObjectURL(photoBlob);
 try{
  const [photo,frame,star,badge,border,icon]=await Promise.all([photoURL,CARD_FACE.frame,CARD_FACE.star,model.badge,model.badgeBorder,model.icon].map(loadImage));
  const canvas=document.createElement('canvas');canvas.width=996;canvas.height=1590;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('이미지를 만들 수 없는 브라우저예요.');
  ctx.scale(6,6);ctx.fillStyle='#fff';ctx.fillRect(0,0,166,265);ctx.drawImage(frame,0,0,166,265);
  const b=CARD_FACE.photo,scale=Math.max(b.width/photo.naturalWidth,b.height/photo.naturalHeight),sw=b.width/scale,sh=b.height/scale;
  ctx.drawImage(photo,(photo.naturalWidth-sw)/2,(photo.naturalHeight-sh)/2,sw,sh,b.x,b.y,b.width,b.height);
  ctx.fillStyle='#000';ctx.textBaseline='alphabetic';ctx.font='400 7px MonaS12';ctx.fillText('MEONG MEONG GO!',16,23);
  ctx.save();ctx.beginPath();ctx.rect(16,166,94,23);ctx.clip();ctx.font='700 12.324px MonaS12';ctx.fillText(model.dogName,16,181.324);ctx.restore();
  ctx.drawImage(border,112,169,38,14.63);ctx.drawImage(badge,112.73,169.73,36.54,13.17);ctx.drawImage(icon,115.65,171.92,8.77,8.77);
  ctx.font='400 7px MonaS12';ctx.textAlign='center';ctx.fillText(model.element,132.5,179);ctx.textAlign='left';
  for(const [label,value,y] of [['파워',model.power,198],['애교',model.charm,217]]){ctx.font='400 10px MonaS12';ctx.fillText(label,16,y+10);for(let i=0;i<value;i++)ctx.drawImage(star,40+i*13.4,y,11.36,10.32);}
  ctx.font='400 7px MonaS12';ctx.save();ctx.beginPath();ctx.rect(16,237,84,14);ctx.clip();ctx.fillText(model.author,16,247);ctx.restore();ctx.textAlign='right';ctx.fillText(model.date,150,247);
  const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));if(!blob)throw Error('이미지를 만들지 못했어요.');
  const name=model.dogName.replace(/[^\p{L}\p{N}_-]/gu,'').slice(0,30)||'멍멍이';return new File([blob],`멍멍GO-${name}.png`,{type:'image/png'});
 }finally{URL.revokeObjectURL(photoURL);}
}
