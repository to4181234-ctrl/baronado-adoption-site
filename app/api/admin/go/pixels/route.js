import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {hasAdminSession,sameOrigin} from '../../../../../lib/server/adminSession.js';
import {adminDatabase,validId} from '../../../../../lib/server/adminData.js';
import {GO_OFFICIAL_BUCKET} from '../../../../../lib/goOfficial.js';
import {pixelImageUrls} from '../../../../../lib/server/goPixelUrls.js';
export const runtime='nodejs';export const dynamic='force-dynamic';
const fail=(error,status=400)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
const json=data=>Response.json(data,{headers:{'Cache-Control':'no-store'}});
async function permitted(request,modify=false){
 if(!await hasAdminSession(request))return fail('관리자 접근이 필요해요.',401);
 if(modify&&!sameOrigin(request))return fail('현재 사이트에서 다시 시도해 주세요.',403);
 return null;
}
const slug=(dog,kind)=>`${dog}/pixel/${kind}/${randomUUID()}.png`;
async function load(db){
 const [dogs,pixels,sets,assets]=await Promise.all([
  db.from('dogs').select('id,name,adopted').eq('category','adoption').order('name'),
  db.from('go_dog_pixel_assets').select('dog_id,care_path,thumbnail_path,is_published,legacy_existing,updated_at'),
  db.from('go_official_sets').select('dog_id,current_version'),
  db.from('go_official_assets').select('version_id,slot,title,display_path')
 ]);
 if([dogs,pixels,sets,assets].some(r=>r.error))throw Error('관리 자료를 읽지 못했어요. 먼저 격리 DB에 마이그레이션을 적용하세요.');
 const catalog=new Map((pixels.data||[]).map(x=>[x.dog_id,x]));
 const setMap=new Map((sets.data||[]).map(x=>[x.dog_id,x]));
 const rows=(dogs.data||[]).map(d=>{
  const px=catalog.get(d.id)||{};const set=setMap.get(d.id);
  const slots=new Set((assets.data||[]).filter(a=>a.version_id===set?.current_version&&a.slot>=1&&a.slot<=5&&a.display_path&&(a.title?.trim()||px.legacy_existing)).map(a=>a.slot));
  return {dogId:d.id,name:d.name,adopted:d.adopted,carePath:px.care_path||null,thumbnailPath:px.thumbnail_path||null,
   published:!!px.is_published,officialReady:slots.size===5,ready:!!px.is_published&&slots.size===5&&!!px.care_path&&!!px.thumbnail_path,updatedAt:px.updated_at||null};
 });
 const paths=rows.flatMap(row=>[row.carePath,row.thumbnailPath].filter(Boolean));
 const urls=await pixelImageUrls(db,GO_OFFICIAL_BUCKET,paths,1800);
 return rows.map(r=>({...r,careUrl:urls.get(r.carePath)||null,thumbnailUrl:urls.get(r.thumbnailPath)||null,carePath:undefined,thumbnailPath:undefined}));
}
export async function GET(request){const d=await permitted(request);if(d)return d;try{return json({dogs:await load(adminDatabase())});}catch(e){return fail(e.message,500);}}
export async function PUT(request){
 const d=await permitted(request,true);if(d)return d;
 let form;try{form=await request.formData();}catch{return fail('업로드를 확인해주세요.');}
 const dogId=form.get('dogId'),kind=form.get('kind'),file=form.get('file');
 if(!validId(dogId)||!['care','thumbnail'].includes(kind)||!file||typeof file.arrayBuffer!=='function')return fail('강아지와 파일 항목을 확인해주세요.');
 if(!['image/png','image/webp'].includes(file.type)||file.size<100||file.size>3*1024*1024)return fail('PNG/WEBP 픽셀 이미지를 3MB 이하로 올려주세요.');
 try{
  const bytes=Buffer.from(await file.arrayBuffer());const meta=await sharp(bytes,{limitInputPixels:9000000}).metadata();
  if(!['png','webp'].includes(meta.format)||meta.width<16||meta.height<16||meta.width>3000||meta.height>3000) return fail('16~3000px PNG/WEBP 파일만 등록할 수 있어요.');
  // Lossless PNG, no enlargement/resampling of the author's pixel artwork.
  const output=await sharp(bytes).png({compressionLevel:9}).toBuffer();
  const db=adminDatabase();const match=await db.from('dogs').select('id').eq('id',dogId).eq('category','adoption').maybeSingle();
  if(match.error||!match.data)return fail('등록되지 않은 보호 강아지예요.',404);
  const path=slug(dogId,kind);const uploaded=await db.storage.from(GO_OFFICIAL_BUCKET).upload(path,output,{upsert:false,contentType:'image/png'});
  if(uploaded.error)throw uploaded.error;
  const key=kind==='care'?'care_path':'thumbnail_path';
  const existing=await db.from('go_dog_pixel_assets').select('dog_id').eq('dog_id',dogId).maybeSingle();
  if(existing.error)throw existing.error;
  const values={[key]:path,is_published:false,updated_at:new Date().toISOString()};
  const saved=existing.data
    ?await db.from('go_dog_pixel_assets').update(values).eq('dog_id',dogId)
    :await db.from('go_dog_pixel_assets').insert({dog_id:dogId,...values});
  if(saved.error){await db.storage.from(GO_OFFICIAL_BUCKET).remove([path]);throw saved.error;}
  return json({ok:true,kind});
 }catch{return fail('픽셀 일러스트 업로드에 실패했어요.',500);}
}
export async function POST(request){
 const d=await permitted(request,true);if(d)return d;
 let body;try{body=await request.json();}catch{return fail('요청을 확인해주세요.');}
 if(!validId(body?.dogId)||typeof body.published!=='boolean')return fail('강아지·공개 상태를 확인해주세요.');
 try{
  const db=adminDatabase();const list=await load(db);const dog=list.find(x=>x.dogId===body.dogId);
  if(!dog)return fail('강아지를 찾지 못했어요.',404);
  if(body.published&&(!dog.officialReady||!dog.careUrl||!dog.thumbnailUrl))return fail('공식 카드 5종과 돌보기·대표 픽셀 일러스트를 모두 등록해야 공개할 수 있어요.',409);
  const {error}=await db.from('go_dog_pixel_assets').update({is_published:body.published,updated_at:new Date().toISOString()}).eq('dog_id',body.dogId);
  if(error)throw error;
  return json({ok:true,published:body.published});
 }catch{return fail('공개 상태 변경에 실패했어요.',500);}
}
