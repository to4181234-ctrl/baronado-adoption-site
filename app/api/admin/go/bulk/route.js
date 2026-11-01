import {adminDatabase} from '../../../../../lib/server/adminData.js';
import {authorizeMutation,apiResponse,readJson} from '../../../../../lib/server/adminHttp.js';
import {parseBulkCardIds} from '../../../../../lib/goBulkDelete.js';
export const runtime='nodejs';
export async function DELETE(request){
 const blocked=authorizeMutation(request);if(blocked)return blocked;
 try{
  const input=await readJson(request,12000);
  let ids;try{ids=parseBulkCardIds(input.ids)}catch(e){return apiResponse({error:e.message},400)}
  const expectations=input.statusById||{};
  if(!expectations||typeof expectations!=='object'||Array.isArray(expectations)||Object.keys(expectations).length!==ids.length||!ids.every(id=>['approved','rejected','hidden','pending'].includes(expectations[id])))return apiResponse({error:'선택한 게시물의 상태를 다시 확인해주세요.'},400);
  const db=adminDatabase();
  const {data:found,error:lookup}=await db.from('go_cards').select('id,status,image_path').in('id',ids);if(lookup)throw lookup;
  if(found.length!==ids.length||found.some(row=>row.status!==expectations[row.id]))return apiResponse({error:'일부 게시물이 변경됐어요. 목록을 새로고침한 후 다시 선택해주세요.'},409);
  const {data:deleted,error}=await db.from('go_cards').delete().in('id',ids).select('id,image_path');if(error)throw error;
  const paths=(deleted||[]).map(row=>row.image_path).filter(Boolean);
  const removed=paths.length?await db.storage.from('go-cards').remove(paths):{error:null};
  return apiResponse({ok:true,deletedIds:(deleted||[]).map(row=>row.id),cleanupPending:Boolean(removed.error),partial:deleted.length!==ids.length});
 }catch{return apiResponse({error:'게시물 삭제에 실패했어요. 삭제 여부를 확인해주세요.'},500)}
}
