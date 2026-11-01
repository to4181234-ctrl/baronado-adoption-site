import {randomUUID} from 'node:crypto';
import {adminDatabase} from '../../../../../lib/server/adminData.js';
import {authorizeMutation,apiResponse} from '../../../../../lib/server/adminHttp.js';
export const runtime='nodejs';
const FORMATS={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
export async function POST(request){
 const blocked=authorizeMutation(request);if(blocked)return blocked;
 try{
  const file=(await request.formData()).get('image');
  if(!(file instanceof File)||!FORMATS[file.type]||file.size<=0||file.size>3*1024*1024)return apiResponse({error:'JPG, PNG, WebP 이미지(최대 3MB)를 선택해주세요.'},400);
  const key=`banners/${randomUUID()}.${FORMATS[file.type]}`;
  const db=adminDatabase();const {error}=await db.storage.from('dog-images').upload(key,Buffer.from(await file.arrayBuffer()),{contentType:file.type,cacheControl:'3600',upsert:false});if(error)throw error;
  const {data}=db.storage.from('dog-images').getPublicUrl(key);
  return apiResponse({imageUrl:data.publicUrl},201);
 }catch{return apiResponse({error:'배너 이미지를 업로드하지 못했어요. 기존 이미지는 유지돼요.'},500)}
}
