import {adminDatabase,validId} from '../../../../../lib/server/adminData.js';
import {releasedDogs} from '../../../../../lib/server/goDogRelease.js';
import {GO_OFFICIAL_BUCKET} from '../../../../../lib/goOfficial.js';
import {pixelImageUrls} from '../../../../../lib/server/goPixelUrls.js';
export const dynamic='force-dynamic';
export async function GET(request){
 const dogId=new URL(request.url).searchParams.get('dogId');
 if(!validId(dogId))return Response.json({error:'강아지를 선택해주세요.'},{status:400});
 try{
  const db=adminDatabase();const ready=(await releasedDogs(db)).get(dogId);
  if(!ready)return Response.json({ready:false},{status:404,headers:{'Cache-Control':'no-store'}});
  const paths=[ready.thumbnail_path,ready.care_path];
  const urls=await pixelImageUrls(db,GO_OFFICIAL_BUCKET,paths,1800);
  if(!urls.get(paths[0])||!urls.get(paths[1]))throw Error('pixel urls');
  return Response.json({ready:true,thumbnailUrl:urls.get(paths[0]),careUrl:urls.get(paths[1])},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'강아지 공개 자료를 읽지 못했어요.'},{status:500,headers:{'Cache-Control':'no-store'}});}
}
