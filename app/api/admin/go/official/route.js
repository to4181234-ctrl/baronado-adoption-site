import sharp from 'sharp';
import { hasAdminSession, sameOrigin } from '../../../../../lib/server/adminSession.js';
import { adminDatabase, validId } from '../../../../../lib/server/adminData.js';
import { GO_OFFICIAL_BUCKET, GO_OFFICIAL_MAX_BYTES, goStage2ServerEnabled,
  officialPhotoOptions, officialPhotoOutput, officialStoragePaths } from '../../../../../lib/goOfficial.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const fail=(error,status=400)=>Response.json({error},{status,headers});
const allow=(request,mutation=false)=>{
 if(!goStage2ServerEnabled())return fail('공식 멍카드 기능을 준비하고 있어요.',503);
 if(!hasAdminSession(request))return fail('관리자 로그인이 필요해요.',401);
 if(mutation&&!sameOrigin(request))return fail('같은 사이트에서 다시 시도해주세요.',403);
 return null;
};
const safeBody=async request=>{try{return await request.json();}catch{return null;}};
async function isDraft(db,dogId,versionId){
 const {data,error}=await db.from('go_official_versions')
  .select('id,dog_id,status').eq('id',versionId).eq('dog_id',dogId).maybeSingle();
 if(error)throw error;
 return data?.status==='draft';
}
const json=(result,status=200)=>Response.json(result,{status,headers});
async function uploadAsset(db,{dogId,versionId,slot,title,cropX,cropY,zoom,source}){
 const settings=officialPhotoOptions({slot,title,cropX,cropY,zoom});
 const bytes=Buffer.isBuffer(source)?source:Buffer.from(source);
 const originalFormat=(await sharp(bytes).metadata()).format;
 const originalMime={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[originalFormat];
 if(!originalMime)throw Error('지원하지 않는 사진 형식이에요.');
 const rendered=await officialPhotoOutput(bytes,slot,settings);
 const paths=officialStoragePaths(dogId,versionId,slot);
 const uploaded=[];
 try{
  for(const [path,contents,contentType] of [
   [paths.original,bytes,originalMime],
   [paths.display,rendered,slot===6?'image/png':'image/webp']
  ]){
    const {error}=await db.storage.from(GO_OFFICIAL_BUCKET)
      .upload(path,contents,{upsert:false,contentType});
    if(error)throw error;
    uploaded.push(path);
  }
  if(!await isDraft(db,dogId,versionId))throw Error('등록 중 공개 상태가 변경됐어요. 새로고침해 주세요.');
  const row={version_id:versionId,slot,title:settings.title,
    original_path:paths.original,display_path:paths.display,
    crop_x:settings.cropX,crop_y:settings.cropY,zoom:settings.zoom};
  const {error}=await db.from('go_official_assets').upsert(row,{onConflict:'version_id,slot'});
  if(error)throw error;
  return {row,uploaded};
 }catch(error){
  if(uploaded.length)await db.storage.from(GO_OFFICIAL_BUCKET).remove(uploaded);
  throw error;
 }
}
export async function GET(request){
 const denied=allow(request);if(denied)return denied;
 const params=new URL(request.url).searchParams;
 const chosen=params.get('dogId');
 if(chosen&&!validId(chosen))return fail('강아지 정보를 확인해주세요.');
 try{
  const db=adminDatabase();
  let dogsReq=db.from('dogs').select('id,name,adopted')
    .eq('category','adoption').order('name',{ascending:true});
  if(chosen)dogsReq=dogsReq.eq('id',chosen);
  const {data:dogs,error:dogsError}=await dogsReq;
  if(dogsError)throw dogsError;
  const ids=(dogs||[]).map(d=>d.id);
  if(!ids.length)return json({dogs:[],sets:[]});
  const {data:sets,error:setsError}=await db.from('go_official_sets')
    .select('dog_id,current_version,paused,published_once_at')
    .in('dog_id',ids);
  if(setsError)throw setsError;
  const {data:versions,error:versError}=await db.from('go_official_versions')
    .select('id,dog_id,status,created_at,published_at')
    .in('dog_id',ids).in('status',['draft','published'])
    .order('created_at',{ascending:false});
  if(versError)throw versError;
  const versionsIds=(versions||[]).map(v=>v.id);
  let assets=[];
  if(versionsIds.length){
   const found=await db.from('go_official_assets')
     .select('version_id,slot,title,original_path,display_path,crop_x,crop_y,zoom')
     .in('version_id',versionsIds).order('slot');
   if(found.error)throw found.error;
   assets=found.data||[];
  }
  const paths=assets.map(asset=>asset.display_path);
  const signed=paths.length?await db.storage.from(GO_OFFICIAL_BUCKET).createSignedUrls(paths,1800):{data:[],error:null};
  if(signed.error)throw signed.error;
  const decorated=assets.map((asset,index)=>({
   ...asset, original_path:undefined,display_path:undefined,
   imageUrl:signed.data?.[index]?.signedUrl||''
  }));
  return json({
   dogs:dogs||[],
   sets:(sets||[]).map(s=>({
    dogId:s.dog_id,currentVersion:s.current_version,paused:s.paused,
    publishedOnceAt:s.published_once_at,
    versions:(versions||[]).filter(v=>v.dog_id===s.dog_id)
      .map(v=>({...v,assets:decorated.filter(a=>a.version_id===v.id)}))
   }))
  });
 }catch{return fail('공식 멍카드 관리 정보를 불러오지 못했어요.',500);}
}
export async function POST(request){
 const denied=allow(request,true);if(denied)return denied;
 const body=await safeBody(request);
 if(!validId(body?.dogId))return fail('강아지를 선택해주세요.');
 const action=body?.action;
 if(!['newDraft','publish','pause','resume','discardDraft','deleteSet'].includes(action))
  return fail('관리 작업을 확인해주세요.');
 if(['publish','discardDraft'].includes(action)&&!validId(body?.versionId))return fail('등록·수정안을 확인해주세요.');
 try{
  const db=adminDatabase();
  if(action==='newDraft'){
   const {data,error}=await db.rpc('go_official_new_draft',{p_dog:body.dogId});
   if(error)throw error;
   return json({ok:true,versionId:data});
  }
  const {data,error}=await db.rpc('go_official_manage',{
   p_dog:body.dogId,p_action:action,p_draft:body.versionId||null
  });
  if(error)throw error;
  return json(data,data?.ok?200:409);
 }catch{return fail('관리 작업을 저장하지 못했어요.',500);}
}
export async function PUT(request){
 const denied=allow(request,true);if(denied)return denied;
 let form;
 try{form=await request.formData();}catch{return fail('사진 정보를 확인해주세요.');}
 const dogId=form.get('dogId'),versionId=form.get('versionId'),file=form.get('file');
 if(!validId(dogId)||!validId(versionId)||!file||typeof file.arrayBuffer!=='function')
  return fail('강아지·수정안·사진을 확인해주세요.');
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||
   file.size<1000||file.size>GO_OFFICIAL_MAX_BYTES)return fail('JPG·PNG·WEBP 사진 5MB 이하로 등록해주세요.');
 let settings;
 try{settings=officialPhotoOptions({
  slot:form.get('slot'),title:form.get('title'),
  cropX:form.get('cropX'),cropY:form.get('cropY'),zoom:form.get('zoom')
 });}catch(e){return fail(e.message);}
 try{
  const db=adminDatabase();
  if(!await isDraft(db,dogId,versionId))return fail('임시 저장 중인 세트만 수정할 수 있어요.',409);
  const result=await uploadAsset(db,{dogId,versionId,...settings,
    source:Buffer.from(await file.arrayBuffer())});
  return json({ok:true,slot:settings.slot,updated:true},201);
 }catch{return fail('이미지 처리 또는 업로드에 실패했어요.',500);}
}
export async function PATCH(request){
 const denied=allow(request,true);if(denied)return denied;
 const body=await safeBody(request);
 if(!validId(body?.dogId)||!validId(body?.versionId))
  return fail('강아지와 수정안을 확인해주세요.');
 let settings;
 try{settings=officialPhotoOptions(body);}catch(e){return fail(e.message);}
 try{
  const db=adminDatabase();
  if(!await isDraft(db,body.dogId,body.versionId))
   return fail('공개되지 않은 수정안만 변경할 수 있어요.',409);
  const {data:asset,error}=await db.from('go_official_assets')
    .select('*').eq('version_id',body.versionId).eq('slot',settings.slot).maybeSingle();
  if(error)throw error;
  if(!asset)return fail('먼저 이미지를 업로드해주세요.',409);
  const cropChanged=[['crop_x',settings.cropX],['crop_y',settings.cropY],['zoom',settings.zoom]]
    .some(([name,value])=>Math.abs(Number(asset[name])-value)>0.0001);
  if(cropChanged){
   const original=await db.storage.from(GO_OFFICIAL_BUCKET).download(asset.original_path);
   if(original.error)throw original.error;
   const buffer=Buffer.from(await original.data.arrayBuffer());
   await uploadAsset(db,{dogId:body.dogId,versionId:body.versionId,...settings,source:buffer});
  }else{
   const {error:saveError}=await db.from('go_official_assets')
    .update({title:settings.title,updated_at:new Date().toISOString()})
    .eq('version_id',body.versionId).eq('slot',settings.slot);
   if(saveError)throw saveError;
  }
  return json({ok:true,slot:settings.slot});
 }catch{return fail('수정 내용을 저장하지 못했어요.',500);}
}
