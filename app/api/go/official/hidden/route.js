import sharp from 'sharp';
import {adminDatabase,validId} from '../../../../../lib/server/adminData.js';
import {goError,goMember} from '../../../../../lib/server/goAuth.js';
import {goStage2ServerEnabled,GO_OFFICIAL_BUCKET} from '../../../../../lib/goOfficial.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
 if(!goStage2ServerEnabled())return goError('특별 일러스트를 준비 중이에요.',503);
 const member=await goMember(request);if(!member)return goError('로그인이 필요해요.',401);
 const dogId=new URL(request.url).searchParams.get('dogId');
 if(!validId(dogId))return goError('강아지를 확인해주세요.');
 try{
  const db=adminDatabase();
  const {data:unlock,error:unlockedError}=await db.from('go_official_hidden')
   .select('dog_id').eq('member_id',member.id).eq('dog_id',dogId).maybeSingle();
  if(unlockedError)throw unlockedError;
  if(!unlock)return goError('사진 4종을 모으면 특별 일러스트를 저장할 수 있어요.',403);
  const {data:set,error:setError}=await db.from('go_official_sets')
   .select('current_version').eq('dog_id',dogId).maybeSingle();
  if(setError||!set?.current_version)throw Error('missing edition');
  const {data:asset,error:assetError}=await db.from('go_official_assets')
   .select('display_path').eq('version_id',set.current_version).eq('slot',5).maybeSingle();
  if(assetError||!asset)throw Error('missing hidden');
  const {data:file,error:downloadError}=await db.storage.from(GO_OFFICIAL_BUCKET).download(asset.display_path);
  if(downloadError)throw downloadError;
  const png=await sharp(Buffer.from(await file.arrayBuffer())).png().toBuffer();
  return new Response(png,{status:200,headers:{
   'Content-Type':'image/png','Content-Disposition':'attachment; filename="meonggo-hidden-'+dogId.slice(0,8)+'.png"',
   'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'
  }});
 }catch{return goError('특별 일러스트를 저장하지 못했어요.',500);}
}
