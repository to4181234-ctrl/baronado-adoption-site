import { adminDatabase, validId } from '../../../../lib/server/adminData.js';
import { goError,goMember,goMutationAllowed } from '../../../../lib/server/goAuth.js';
import { koreaDay } from '../../../../lib/goCoins.js';
import { GO_OFFICIAL_BUCKET,goStage2ServerEnabled } from '../../../../lib/goOfficial.js';
import {releasedDogs} from '../../../../lib/server/goDogRelease.js';
import {pixelImageUrls} from '../../../../lib/server/goPixelUrls.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const json=(body,status=200)=>Response.json(body,{status,headers});
const enabled=()=>goStage2ServerEnabled();

export async function GET(request){
 if(!enabled())return goError('공식 멍카드를 준비 중이에요.',503);
 const member=await goMember(request);
 const day=koreaDay();
 try{
  const db=adminDatabase();
  const [setsResult,dogsResult]=await Promise.all([
    db.from('go_official_sets').select('dog_id,current_version,paused')
      .not('current_version','is',null),
    db.from('dogs').select('id,name,adopted,created_at').eq('category','adoption')
  ]);
  if(setsResult.error||dogsResult.error)throw Error('official catalog');
  const sets=setsResult.data||[];
  const dogMap=new Map((dogsResult.data||[]).map(d=>[d.id,d]));
  const [ownedResult,hiddenResult,drawResult,attemptsResult,pendingResult,customResult]=member?await Promise.all([
   db.from('go_official_owned').select('dog_id,slot,power,charm,acquired_at,seen_at')
    .eq('member_id',member.id),
   db.from('go_official_hidden').select('dog_id,power,charm,unlocked_at,seen_at')
    .eq('member_id',member.id),
   db.from('go_official_daily_draws')
    .select('dog_id,slot,duplicate,proposed_power,proposed_charm,resolved_at,created_at')
    .eq('member_id',member.id).eq('local_day',day).maybeSingle(),
   db.from('go_draw_attempts').select('id')
    .eq('member_id',member.id).eq('source_type','free').eq('local_day',day),
   db.from('go_draw_attempts').select('id,dog_id,slot,proposed_power,proposed_charm')
    .eq('member_id',member.id).eq('duplicate',true).is('resolved_at',null)
    .order('created_at',{ascending:false}).limit(1).maybeSingle(),
   db.rpc('go_album_photo_counts',{p_member:member.id})
  ]):[{data:[],error:null},{data:[],error:null},{data:null,error:null},
    {data:[],error:null},{data:null,error:null},{data:[],error:null}];
  if(ownedResult.error||hiddenResult.error||drawResult.error||attemptsResult.error||pendingResult.error||customResult.error)throw Error('owned catalog');
  const owned=ownedResult.data||[],hidden=hiddenResult.data||[];
   const customCounts=new Map((customResult.data||[]).map(c=>[c.dog_id,Number(c.photo_count)||0]));
  const ownedKeys=new Set(owned.map(o=>o.dog_id+':'+o.slot));
  const hiddenKeys=new Set(hidden.map(h=>h.dog_id));
  const eligibleSets=sets.filter(s=> {
    const dog=dogMap.get(s.dog_id);
    return dog&&(!dog.adopted||owned.some(o=>o.dog_id===s.dog_id)||hiddenKeys.has(s.dog_id)||(customCounts.get(s.dog_id)||0)>0);
  });
  const versionIds=eligibleSets.map(s=>s.current_version);
  let assets=[];
  if(versionIds.length){
   const result=await db.from('go_official_assets').select('version_id,slot,title,display_path')
      .in('version_id',versionIds).order('slot');
   if(result.error)throw result.error;
   assets=result.data||[];
  }
  // Some historical drafts may point to an incomplete published version.
  // Keep those dogs out of the album until all five slots are configured.
  const released=await releasedDogs(db);
  // The single release checker already validates all five image slots and the
  // title rules (including published legacy artwork). Do not reapply a stricter
  // duplicate rule here: that previously hid Oreo despite its registered art.
  const completeSets=eligibleSets.filter(set=>released.has(set.dog_id));
  const viewable=[];
  for(const set of completeSets){
   for(const asset of assets){
    if(asset.version_id!==set.current_version)continue;
    if(asset.slot===5?hiddenKeys.has(set.dog_id):ownedKeys.has(set.dog_id+':'+asset.slot)){
      viewable.push({dogId:set.dog_id,...asset});
    }
   }
  }
  const signed=viewable.length?await db.storage.from(GO_OFFICIAL_BUCKET)
    .createSignedUrls(viewable.map(x=>x.display_path),1800):{data:[],error:null};
  if(signed.error)throw signed.error;
  const photoMap=new Map(viewable.map((asset,index)=>[
    asset.dogId+':'+asset.slot,
    {title:asset.title,imageUrl:signed.data?.[index]?.signedUrl||''}
  ]));
  const thumbnailPaths=completeSets.map(s=>released.get(s.dog_id)?.thumbnail_path).filter(Boolean);
  const thumbUrls=await pixelImageUrls(db,GO_OFFICIAL_BUCKET,thumbnailPaths,1800);
  const photoThumbs=new Map(completeSets.map(s=>[s.dog_id,thumbUrls.get(released.get(s.dog_id)?.thumbnail_path)||'']));
  const catalog=completeSets.map(s=>{
   const dog=dogMap.get(s.dog_id);
   const cards=owned.filter(x=>x.dog_id===s.dog_id);
   const special=hidden.find(x=>x.dog_id===s.dog_id);
   return {
    dogId:s.dog_id,name:dog.name,adopted:dog.adopted,createdAt:dog.created_at,paused:s.paused,publishedComplete:true,thumbnailPathAvailable:true,
    thumbnailUrl:photoThumbs.get(s.dog_id)||null,
    available:!dog.adopted&&!s.paused,
    collected:cards.length,personalCount:customCounts.get(s.dog_id)||0,missing:4-cards.length,
    slots:Array.from({length:4},(_,i)=>{
     const slot=i+1,own=cards.find(x=>x.slot===slot),asset=photoMap.get(s.dog_id+':'+slot);
     return {slot,owned:Boolean(own),title:own?asset?.title||'':'',
      imageUrl:own?asset?.imageUrl||'':'',power:own?.power??null,charm:own?.charm??null,
      new:own?!own.seen_at:false,acquiredAt:own?.acquired_at||null};
    }),
    hidden:{unlocked:Boolean(special),new:Boolean(special&&!special.seen_at),
      title:special?photoMap.get(s.dog_id+':5')?.title||'':'',
      imageUrl:special?photoMap.get(s.dog_id+':5')?.imageUrl||'':'',
      power:special?.power??null,charm:special?.charm??null,
      unlockedAt:special?.unlocked_at||null}
   };
  }).sort((a,b)=>Number(b.collected>0)-Number(a.collected>0)||a.name.localeCompare(b.name,'ko'));
  const drawsToday=Number(Boolean(drawResult.data))+(attemptsResult.data||[]).length;
  const pending=pendingResult.data;
  return json({day,drawCount:drawsToday,drawLimit:2,drawsRemaining:Math.max(0,2-drawsToday),
    drawUsed:drawsToday>=2,
    pendingDuplicate:pending?{
      choiceId:pending.id,dogId:pending.dog_id,slot:pending.slot,
      proposedPower:pending.proposed_power,proposedCharm:pending.proposed_charm
    }:null,
    dogs:catalog});
 }catch{return goError('공식 멍카드 도감을 불러오지 못했어요.',500);}
}
export async function POST(request){
 if(!enabled())return goError('공식 멍카드를 준비 중이에요.',503);
 const blocked=goMutationAllowed(request);if(blocked)return blocked;
 const member=await goMember(request);if(!member)return goError('로그인이 필요해요.',401);
 let body;try{body=await request.json();}catch{return goError('요청을 확인해주세요.');}
 let rpc,params;
 if(body?.action==='draw'&&validId(body.requestId)){
  rpc='go_official_draw_v2';params={p_member:member.id,p_request:body.requestId};
 }else if(body?.action==='resolve'&&typeof body.replace==='boolean'&&validId(body.choiceId)){
  rpc='go_official_resolve_duplicate_v2';
  params={p_member:member.id,p_attempt:body.choiceId,p_replace:body.replace};
 }else if(body?.action==='seen'&&validId(body.dogId)&&Number.isInteger(body.slot)&&
  body.slot>=1&&body.slot<=5){
  rpc='go_official_mark_seen';params={p_member:member.id,p_dog:body.dogId,p_slot:body.slot};
 }else if(body?.action==='unlockHidden'&&validId(body.dogId)){
  rpc='go_official_unlock_hidden';params={p_member:member.id,p_dog:body.dogId};
 }else return goError('공식 멍카드 작업을 확인해주세요.');
 try{
  const {data,error}=await adminDatabase().rpc(rpc,params);
  if(error)throw error;
  if(body.action==='seen')return json({ok:Boolean(data)},data?200:404);
  return json(data,data?.ok?200:409);
 }catch{return goError('공식 멍카드를 처리하지 못했어요.',500);}
}

/** Atomic ownership-checked bulk deletion of official/HIDDEN cards (not personal camera cards). */
export async function DELETE(request){
 if(!enabled())return goError('공식 멍카드를 준비 중이에요.',503);
 const blocked=goMutationAllowed(request);if(blocked)return blocked;
 const member=await goMember(request);if(!member)return goError('로그인이 필요해요.',401);
 let body;try{body=await request.json();}catch{return goError('선택한 카드를 확인해주세요.');}
 const slots=body?.slots;
 if(!validId(body?.dogId)||!Array.isArray(slots)||slots.length<1||slots.length>5||
   new Set(slots).size!==slots.length||slots.some(n=>!Number.isInteger(n)||n<1||n>5))
   return goError('삭제할 공식 멍카드를 확인해주세요.');
 try{
  const {data,error}=await adminDatabase().rpc('go_official_bulk_delete',{p_member:member.id,p_dog:body.dogId,p_slots:slots});
  if(error)throw error;
  return json(data,data?.ok?200:409);
 }catch{return goError('선택한 공식 멍카드를 삭제하지 못했어요.',500);}
}
