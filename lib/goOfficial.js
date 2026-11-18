import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
export const GO_OFFICIAL_BUCKET = 'go-official-cards';
export const GO_OFFICIAL_PHOTO_WIDTH = 536; // 4x Figma's 134px image viewport
export const GO_OFFICIAL_PHOTO_HEIGHT = 528; // 4x Figma's 132px image viewport
export const GO_OFFICIAL_MAX_BYTES = 5*1024*1024;
export const goStage2ServerEnabled = () =>
  process.env.MEONGGO_STAGE1_COINS_ENABLED === '1' &&
  process.env.MEONGGO_STAGE2_OFFICIAL_ENABLED === '1';

export function officialPhotoOptions({slot,cropX=0.5,cropY=0.5,zoom=1,title=''}) {
  const s=Number(slot),x=Number(cropX),y=Number(cropY),z=Number(zoom);
  if (!Number.isInteger(s) || s<1 || s>5 ||
      ![x,y,z].every(Number.isFinite) || x<0||x>1||y<0||y>1||z<1||z>3)
    throw Error('사진 위치·확대 설정을 확인해주세요.');
  const t=typeof title==='string'?title.trim():'';
  if (t.length<1||t.length>30)throw Error(s===5?'HIDDEN 카드 제목은 1~30자로 입력해주세요.':'각 공식 사진의 제목은 1~30자로 입력해주세요.');
  return {slot:s,cropX:x,cropY:y,zoom:z,title:t};
}

export async function officialPhotoOutput(buffer,slot,settings) {
  if(!Buffer.isBuffer(buffer)||buffer.length<1000||buffer.length>GO_OFFICIAL_MAX_BYTES)
    throw Error('원본은 5MB 이하의 이미지여야 해요.');
  const meta=await sharp(buffer,{limitInputPixels:20000000}).metadata();
  if(!['jpeg','png','webp'].includes(meta.format)||meta.width<300||meta.height<300||
    meta.width>6000||meta.height>6000)throw Error('JPG·PNG·WEBP, 최소 300px 이미지를 올려주세요.');
  const options=officialPhotoOptions({...settings,slot});
  // Preserve original bytes in a private bucket. Only the display rendering is cropped.
  if(options.slot===5) return sharp(buffer).rotate().resize({
    width:1200,height:1600,fit:'inside',withoutEnlargement:true
  }).png().toBuffer();
  const rotated=await sharp(buffer).rotate().toBuffer();
  const dimensions=await sharp(rotated).metadata();
  const base=Math.max(GO_OFFICIAL_PHOTO_WIDTH/dimensions.width,
    GO_OFFICIAL_PHOTO_HEIGHT/dimensions.height)*options.zoom;
  const width=Math.max(GO_OFFICIAL_PHOTO_WIDTH,Math.ceil(dimensions.width*base));
  const height=Math.max(GO_OFFICIAL_PHOTO_HEIGHT,Math.ceil(dimensions.height*base));
  const left=Math.min(width-GO_OFFICIAL_PHOTO_WIDTH,Math.round((width-GO_OFFICIAL_PHOTO_WIDTH)*options.cropX));
  const top=Math.min(height-GO_OFFICIAL_PHOTO_HEIGHT,Math.round((height-GO_OFFICIAL_PHOTO_HEIGHT)*options.cropY));
  return sharp(rotated).resize(width,height).extract({
    left,top,width:GO_OFFICIAL_PHOTO_WIDTH,height:GO_OFFICIAL_PHOTO_HEIGHT
  }).webp({quality:85}).toBuffer();
}

export function officialStoragePaths(dogId,versionId,slot) {
  const nonce=randomUUID();
  const prefix=dogId+'/'+versionId+'/'+slot+'/'+nonce;
  return {original:prefix+'-original',display:prefix+(Number(slot)===5?'-display.png':'-display.webp')};
}
export const slugForDog = dogId => String(dogId).slice(0,8);
