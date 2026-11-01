import {adminDatabase,validId} from '../../../../../lib/server/adminData.js';
import {hasAdminSession} from '../../../../../lib/server/adminSession.js';
import {apiResponse} from '../../../../../lib/server/adminHttp.js';
import {loadGoCards} from '../../../../../lib/server/goCards.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
 if(!hasAdminSession(request))return apiResponse({error:'관리자 로그인이 필요해요.'},401);
 try{
  const params=new URL(request.url).searchParams;
  const page=Math.max(0,Math.min(500,Number(params.get('page'))||0));
  const status=['all','approved','hidden'].includes(params.get('status'))?params.get('status'):'all';
  const dog=params.get('dog');if(dog&&dog!=='all'&&!validId(dog))return apiResponse({error:'강아지 필터를 확인해주세요.'},400);
  const order=params.get('order')==='oldest'?'oldest':'newest';
  const result=await loadGoCards({page,limit:5,order,query:(params.get('q')||'').slice(0,80),dogId:dog&&dog!=='all'?dog:null,...(status==='all'?{adminAll:true}:{moderation:status==='hidden'?['hidden','rejected']:status})});
  const {data:dogs,error}=await adminDatabase().from('dogs').select('id,name').order('name');if(error)throw error;
  return apiResponse({...result,dogs:dogs||[]});
 }catch{return apiResponse({error:'관리자 카드 목록을 불러오지 못했어요.'},500)}
}
