import {adminDatabase,validId} from '../../../../../lib/server/adminData.js';
import {releasedDogs} from '../../../../../lib/server/goDogRelease.js';
import {GO_OFFICIAL_BUCKET} from '../../../../../lib/goOfficial.js';
import {pixelImageUrls} from '../../../../../lib/server/goPixelUrls.js';
import {GO_PIXEL_IMAGE_FIELDS,GO_PIXEL_REQUIRED_KINDS,GO_PIXEL_POSES} from '../../../../../lib/goPixelAssets.js';
export const dynamic='force-dynamic';
export async function GET(request){
 const dogId=new URL(request.url).searchParams.get('dogId');
 if(!validId(dogId))return Response.json({error:'강아지를 선택해주세요.'},{status:400});
 try{
  const db=adminDatabase();const ready=(await releasedDogs(db)).get(dogId);
  if(!ready)return Response.json({ready:false},{status:404,headers:{'Cache-Control':'no-store'}});
  const paths=GO_PIXEL_REQUIRED_KINDS.map(kind=>ready[GO_PIXEL_IMAGE_FIELDS[kind]]);
  const urls=await pixelImageUrls(db,GO_OFFICIAL_BUCKET,paths,1800);
  if(paths.some(path=>!urls.get(path)))throw Error('pixel pose urls');
  const poseUrls=Object.fromEntries(GO_PIXEL_POSES.map(pose=>[pose,urls.get(ready[GO_PIXEL_IMAGE_FIELDS[pose]])]));
  return Response.json({ready:true,thumbnailUrl:urls.get(ready.thumbnail_path),
    careUrl:poseUrls.side,poseUrls},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'강아지 공개 자료를 읽지 못했어요.'},{status:500,headers:{'Cache-Control':'no-store'}});}
}
