import { createHash } from 'node:crypto';
import { adminDatabase } from './adminData.js';
export async function collectionBase(memberId) {
 const db=adminDatabase();
 const [countResult,dogsResult,badgesResult]=await Promise.all([
  db.rpc('go_album_photo_counts',{p_member:memberId}),
  db.from('dogs').select('id').eq('category','adoption').eq('adopted',false).order('id'),
  db.from('go_collection_badges').select('id,roster_key,dog_count,earned_at').eq('member_id',memberId).order('earned_at',{ascending:false}).limit(50)
 ]);
 if(countResult.error||dogsResult.error||badgesResult.error)throw new Error('도감 현황을 불러오지 못했어요.');
 const counts=Object.fromEntries(countResult.data.map(row=>[row.dog_id,Number(row.photo_count)]));
 const ids=dogsResult.data.map(dog=>dog.id).sort();
 const rosterKey=createHash('sha256').update(ids.join(',')).digest('hex');
 const collected=ids.filter(id=>(counts[id]||0)>0).length;
 return {counts,ids,rosterKey,badges:badgesResult.data,progress:{collected,total:ids.length,complete:ids.length>0&&collected===ids.length,claimed:badgesResult.data.some(badge=>badge.roster_key===rosterKey)}};
}
export async function loadCollection(memberId) {
 const db=adminDatabase();
 const [base,prefs]=await Promise.all([collectionBase(memberId),db.from('go_album_covers').select('dog_id,card_id').eq('member_id',memberId)]);
 if(prefs.error)throw prefs.error;
 const covers={};
 if(prefs.data.length){
  const rows=await db.from('go_cards').select('id,dog_id,image_path').eq('member_id',memberId).in('id',prefs.data.map(row=>row.card_id));
  if(rows.error)throw rows.error;
  const valid=rows.data.filter(row=>prefs.data.some(pref=>pref.card_id===row.id&&pref.dog_id===row.dog_id));
  if(valid.length){const signed=await db.storage.from('go-cards').createSignedUrls(valid.map(row=>row.image_path),3600);if(signed.error)throw signed.error;valid.forEach((row,i)=>{covers[row.dog_id]={cardId:row.id,imageUrl:signed.data[i]?.signedUrl||''};});}
 }
 return {counts:base.counts,covers,progress:base.progress,badges:base.badges.map(b=>({id:b.id,dogCount:b.dog_count,earnedAt:b.earned_at}))};
}
