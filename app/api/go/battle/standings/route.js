import {adminDatabase} from '../../../../../lib/server/adminData.js';
import {goMember,goError} from '../../../../../lib/server/goAuth.js';
import {collectionBase} from '../../../../../lib/server/goCollection.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const order=['깡지','버디','뽀실','구름','오레오'];
export async function GET(request){
 const member=await goMember(request);if(!member)return goError('로그인이 필요해요.',401);
 try{
  const base=await collectionBase(member.id);const owned=base.ids.filter(id=>(base.counts[id]||0)>0);
  if(!owned.length)return Response.json({records:[]},{headers:{'Cache-Control':'no-store'}});
  const db=adminDatabase();const [dogs,stats]=await Promise.all([
   db.from('dogs').select('id,name').in('id',owned),
   db.from('go_dog_battle_records').select('dog_id,wins,draws,losses').eq('member_id',member.id).in('dog_id',owned)
  ]);
  if(dogs.error||stats.error)throw Error('전적을 불러올 수 없습니다.');
  const numbers=new Map((stats.data||[]).map(row=>[row.dog_id,row]));
  const records=(dogs.data||[]).map(d=>({id:d.id,name:d.name,wins:Number(numbers.get(d.id)?.wins)||0,draws:Number(numbers.get(d.id)?.draws)||0,losses:Number(numbers.get(d.id)?.losses)||0}));
  records.sort((a,b)=>order.indexOf(a.name)-order.indexOf(b.name));
  return Response.json({records},{headers:{'Cache-Control':'no-store'}});
 }catch{return goError('전적 정보를 불러오지 못했어요.',503)}
}
