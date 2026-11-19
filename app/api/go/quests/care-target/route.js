import {randomInt} from 'node:crypto';
import {adminDatabase} from '../../../../../lib/server/adminData.js';
import {goError,goMember} from '../../../../../lib/server/goAuth.js';
import {releasedDogs} from '../../../../../lib/server/goDogRelease.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};
/** Choose any available adoption dog, excluding affection level 10. No reward on navigation. */
export async function GET(request){
 const member=await goMember(request);
 if(!member)return goError('로그인이 필요해요.',401);
 try{
  const db=adminDatabase();
  const dogs=await db.from('dogs').select('id').eq('category','adoption');
  if(dogs.error)throw Error('dog lookup');
  const released=await releasedDogs(db);
  const ids=[...new Set((dogs.data||[]).map(d=>d.id).filter(id=>released.has(id)))];
  if(!ids.length)return Response.json({error:'현재 만날 수 있는 멍멍이가 없어요.'},{status:409,headers:noCache});
  const affinities=await db.from('go_affinity').select('dog_id,level').eq('member_id',member.id).in('dog_id',ids);
  if(affinities.error)throw Error('affinity lookup');
  const levels=new Map((affinities.data||[]).map(x=>[x.dog_id,Number(x.level)||0]));
  const candidates=ids.filter(id=>(levels.get(id)||0)<10);
  if(!candidates.length)return Response.json({error:'모든 멍멍이와 친밀도가 최대치예요!'},{status:409,headers:noCache});
  return Response.json({dogId:candidates[randomInt(candidates.length)]},{headers:noCache});
 }catch{return goError('멍멍이를 찾지 못했어요.',500);}
}
