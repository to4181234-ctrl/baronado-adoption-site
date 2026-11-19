import {adminDatabase,validId} from '../../../../../lib/server/adminData.js';
import {releasedDogs} from '../../../../../lib/server/goDogRelease.js';
import {GO_OFFICIAL_BUCKET} from '../../../../../lib/goOfficial.js';
export const dynamic='force-dynamic';
export async function GET(request){
 const dogId=new URL(request.url).searchParams.get('dogId');
 if(!validId(dogId))return Response.json({error:'강아지를 선택해주세요.'},{status:400});
 try{
  const db=adminDatabase();const ready=(await releasedDogs(db)).get(dogId);
  if(!ready)return Response.json({ready:false},{status:404,headers:{'Cache-Control':'no-store'}});
  const paths=[ready.thumbnail_path,ready.care_path];
  const signed=await db.storage.from(GO_OFFICIAL_BUCKET).createSignedUrls(paths,1800);
  if(signed.error||!signed.data?.[0]?.signedUrl||!signed.data?.[1]?.signedUrl)throw Error('signed');
  return Response.json({ready:true,thumbnailUrl:signed.data[0].signedUrl,careUrl:signed.data[1].signedUrl},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'강아지 공개 자료를 읽지 못했어요.'},{status:500,headers:{'Cache-Control':'no-store'}});}
}
