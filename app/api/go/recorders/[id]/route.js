import {adminDatabase,validId} from '../../../../../lib/server/adminData.js';
import {goError} from '../../../../../lib/server/goAuth.js';
import {loadGoCards} from '../../../../../lib/server/goCards.js';
export const dynamic='force-dynamic';
export async function GET(request,{params}){
 const {id}=await params;if(!validId(id))return goError('멍기록가를 찾지 못했어요.',404);
 const url=new URL(request.url),page=Number(url.searchParams.get('page')||0),order=url.searchParams.get('order')==='oldest'?'oldest':'newest';
 if(!Number.isInteger(page)||page<0||page>1000)return goError('페이지를 확인해주세요.');
 try{const {data:profile,error}=await adminDatabase().rpc('go_public_recorder',{p_member:id});if(error)throw error;if(!profile)return goError('멍기록가를 찾지 못했어요.',404);const cards=await loadGoCards({authorId:id,limit:4,page,order});return Response.json({profile,...cards},{headers:{'Cache-Control':'no-store'}});}catch{return goError('공개 기록을 불러오지 못했어요.',500);}
}
