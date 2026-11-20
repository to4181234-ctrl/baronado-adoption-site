import { createHash } from 'node:crypto';
import { adminDatabase } from './adminData.js';
import {loadBattleHistory} from './goBattleHistory.js';
import {releasedDogs} from './goDogRelease.js';
/** Ranking policy (2026-11-20): count each approved personal card plus each
 * owned official 1–4 and HIDDEN card. Disabled accounts never participate.
 * Read-only aggregation: no production schema or stored card data is changed.
 * Page reads instead of relying on PostgREST's default 1,000 row limit.
 */
async function allRows(query){
 const size=1000,rows=[];
 for(let from=0;from<50000;from+=size){
  const {data,error}=await query(from,size);
  if(error)throw error;
  rows.push(...(data||[]));
  if((data||[]).length<size)return rows;
 }
 throw Error('멍기록가 순위의 집계 범위가 너무 커요.');
}
export async function combinedAlbumStanding(db,memberId,dogId){
 try{
  const [members,personal,official,hidden]=await Promise.all([
   allRows((from,size)=>db.from('go_members').select('id').eq('disabled',false).range(from,from+size-1)),
   allRows((from,size)=>db.from('go_cards').select('member_id').eq('dog_id',dogId).eq('status','approved').range(from,from+size-1)),
   allRows((from,size)=>db.from('go_official_owned').select('member_id').eq('dog_id',dogId).range(from,from+size-1)),
   allRows((from,size)=>db.from('go_official_hidden').select('member_id').eq('dog_id',dogId).range(from,from+size-1))
  ]);
  const active=new Set(members.map(x=>x.id));
  const scores=new Map();
  for(const row of [...personal,...official,...hidden]){
   if(!active.has(row.member_id))continue;
   scores.set(row.member_id,(scores.get(row.member_id)||0)+1);
  }
  const collected=scores.get(memberId)||0,participants=scores.size;
  if(!collected)return {data:{collected,participants,rank:null,ties:0,percentile:null},error:null};
  const vals=[...scores.values()];
  const higher=vals.filter(n=>n>collected).length;
  const ties=vals.filter(n=>n===collected).length;
  return {data:{collected,participants,rank:higher+1,ties,
   percentile:participants>=10?Math.ceil((higher+ties)/participants*100):null},error:null};
 }catch(error){return {data:null,error};}
}

export async function collectionBase(memberId) {
 const db=adminDatabase();
 const [countResult,dogsResult,badgesResult]=await Promise.all([
  db.rpc('go_album_photo_counts',{p_member:memberId}),
  db.from('dogs').select('id').eq('category','adoption').eq('adopted',false).order('id'),
  db.from('go_collection_badges').select('id,roster_key,dog_count,earned_at').eq('member_id',memberId).order('earned_at',{ascending:false}).limit(50)
 ]);
 if(countResult.error||dogsResult.error||badgesResult.error)throw new Error('도감 현황을 불러오지 못했어요.');
 const published=await releasedDogs(db);
 const counts=Object.fromEntries(countResult.data.map(row=>[row.dog_id,Number(row.photo_count)]));
 const ids=dogsResult.data.filter(dog=>published.has(dog.id)).map(dog=>dog.id).sort();
 const rosterKey=createHash('sha256').update(ids.join(',')).digest('hex');
 const collected=ids.filter(id=>(counts[id]||0)>0).length;
 return {counts,ids,rosterKey,badges:badgesResult.data,progress:{collected,total:ids.length,complete:ids.length>0&&collected===ids.length,claimed:badgesResult.data.some(badge=>badge.roster_key===rosterKey)}};
}
export async function loadCollection(memberId,dogId=null) {
 const db=adminDatabase();
 const [base,prefs,rank,battleRecords]=await Promise.all([collectionBase(memberId),db.from('go_album_covers').select('dog_id,card_id').eq('member_id',memberId),dogId?combinedAlbumStanding(db,memberId,dogId):Promise.resolve({data:null,error:null}),loadBattleHistory(db,memberId)]);
 if(prefs.error)throw prefs.error;
 const covers={};
 if(prefs.data.length){
  const rows=await db.from('go_cards').select('id,dog_id,image_path').eq('member_id',memberId).in('id',prefs.data.map(row=>row.card_id));
  if(rows.error)throw rows.error;
  const valid=rows.data.filter(row=>prefs.data.some(pref=>pref.card_id===row.id&&pref.dog_id===row.dog_id));
  if(valid.length){const signed=await db.storage.from('go-cards').createSignedUrls(valid.map(row=>row.image_path),3600);if(signed.error)throw signed.error;valid.forEach((row,i)=>{covers[row.dog_id]={cardId:row.id,imageUrl:signed.data[i]?.signedUrl||''};});}
 }
 return {counts:base.counts,covers,battleRecords,standing:rank.error?null:rank.data,progress:base.progress,badges:base.badges.map(b=>({id:b.id,dogCount:b.dog_count,earnedAt:b.earned_at}))};
}
