import {adminDatabase,validId} from '../../../../../lib/server/adminData.js';
import {goError} from '../../../../../lib/server/goAuth.js';
import {loadBattleHistory} from '../../../../../lib/server/goBattleHistory.js';
import {loadGoCards} from '../../../../../lib/server/goCards.js';
import {FIGMA_DOGS,gameElement} from '../../../../../lib/goV3Game.js';
import {GO_OFFICIAL_BUCKET} from '../../../../../lib/goOfficial.js';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const fail=()=>goError('공개 프로필을 불러오지 못했어요.',500);
const safeKind=value=>value==='custom'?'custom':'official';
const orderValue=value=>value==='oldest'?'oldest':'newest';
const emptyStats=()=>({wins:0,draws:0,losses:0});

/** Public-only view. Never return wallet, transaction, private card or account data. */
export async function GET(request,{params}){
 const {id}=await params;if(!validId(id))return goError('멍기록가를 찾지 못했어요.',404);
 const url=new URL(request.url);
 const page=Number(url.searchParams.get('page')||0),dogId=url.searchParams.get('dog')||null;
 const kind=safeKind(url.searchParams.get('kind')),order=orderValue(url.searchParams.get('order'));
 if(!Number.isInteger(page)||page<0||page>1000)return goError('페이지를 확인해주세요.');
 if(dogId&&!validId(dogId))return goError('강아지를 확인해주세요.');
 try{
  const db=adminDatabase();
  const [userResult,dogsResult,officialResult,hiddenResult]=await Promise.all([
   db.from('go_members').select('id,nickname,profile_bio,avatar_dog').eq('id',id).eq('disabled',false).maybeSingle(),
   db.from('dogs').select('id,name').eq('category','adoption'),
   db.from('go_official_owned').select('dog_id,slot,power,charm,acquired_at').eq('member_id',id),
   db.from('go_official_hidden').select('dog_id,unlocked_at').eq('member_id',id)
  ]);
  if(userResult.error||dogsResult.error||officialResult.error||hiddenResult.error) return fail();
  if(!userResult.data)return goError('멍기록가를 찾지 못했어요.',404);
  const user=userResult.data,official=officialResult.data||[],hidden=hiddenResult.data||[];
  // Paginate published cards: Supabase's default 1,000-row response cap must
  // not silently undercount a prolific recorder's public card total.
  const approved=[];
  for(let start=0;start<100000;start+=500){
   const r=await db.from('go_cards').select('dog_id').eq('member_id',id).eq('status','approved')
    .order('id').range(start,start+499);
   if(r.error)return fail();approved.push(...(r.data||[]));if((r.data||[]).length<500)break;
  }
  if(approved.length===100000)return fail();
  const dogSet=new Set((dogsResult.data||[]).map(d=>d.id));
  const counts=new Map();
  for(const c of approved)if(dogSet.has(c.dog_id))counts.set(c.dog_id,(counts.get(c.dog_id)||0)+1);
  for(const c of official)if(dogSet.has(c.dog_id))counts.set(c.dog_id,(counts.get(c.dog_id)||0)+1);
  for(const c of hidden)if(dogSet.has(c.dog_id))counts.set(c.dog_id,(counts.get(c.dog_id)||0)+1);
  const dogList=FIGMA_DOGS.map(name=>(dogsResult.data||[]).find(d=>d.name===name)).filter(Boolean)
   .map(d=>({id:d.id,name:d.name,element:gameElement(d.name),publicCount:counts.get(d.id)||0,
    officialCount:official.filter(o=>o.dog_id===d.id).length+hidden.filter(h=>h.dog_id===d.id).length,
    customCount:(counts.get(d.id)||0)-official.filter(o=>o.dog_id===d.id).length-hidden.filter(h=>h.dog_id===d.id).length}))
   .sort((a,b)=>Number(b.publicCount>0)-Number(a.publicCount>0));
  const profile={id:user.id,nickname:user.nickname,bio:user.profile_bio||'',avatarDog:user.avatar_dog||null,
   publicCards:[...counts.values()].reduce((a,b)=>a+b,0),dogs:dogList.filter(d=>d.publicCount>0).length};
  // Dog-specific PvP history requires Stage 3's reviewed dog_id schema migration.
  // Missing schema never becomes fabricated zero wins/losses.
  let recordsAvailable=true;
  const records=[];
  // Use exact database counts, never the 20-item recent-match window or an arbitrary row cap.
  const eligible=dogList.filter(d=>d.publicCount>0);
  try{const totals=await loadBattleHistory(db,id);for(const dog of eligible){const stats=totals[dog.id];if(stats?.total)records.push({dogId:dog.id,name:dog.name,wins:stats.wins,draws:stats.draws,losses:stats.losses});}}
  catch{recordsAvailable=false;}
  const base={profile,dogs:dogList,records,recordsAvailable};
  if(!dogId)return Response.json(base,{headers});
  const selected=dogList.find(d=>d.id===dogId);if(!selected)return goError('강아지를 찾지 못했어요.',404);
  if(kind==='custom'){
   const cards=await loadGoCards({authorId:id,dogId,limit:12,page,order});
   // Explicit public-only fields; loadGoCards is filtered to approved records.
   return Response.json({...base,dog:selected,kind,...cards},{headers});
  }
  const owned=official.filter(o=>o.dog_id===dogId&&o.slot>=1&&o.slot<=4);
  const special=hidden.some(h=>h.dog_id===dogId);
  const setResult=await db.from('go_official_sets').select('current_version').eq('dog_id',dogId).maybeSingle();
  if(setResult.error)return fail();
  let assets=[];
  if(setResult.data?.current_version){const r=await db.from('go_official_assets').select('slot,title,display_path')
    .eq('version_id',setResult.data.current_version).in('slot',[1,2,3,4,5]);if(r.error)return fail();assets=r.data||[];}
  const viewable=assets.filter(a=>a.slot===5?special:owned.some(o=>o.slot===a.slot));
  const signed=viewable.length?await db.storage.from(GO_OFFICIAL_BUCKET).createSignedUrls(viewable.map(a=>a.display_path),1800):{data:[],error:null};
  if(signed.error)return fail();
  const images=new Map(viewable.map((a,i)=>[a.slot,{title:a.title,imageUrl:signed.data?.[i]?.signedUrl||''}]));
  const slots=[1,2,3,4].map(slot=>{const row=owned.find(o=>o.slot===slot),asset=images.get(slot);return {slot,owned:Boolean(row),title:row?asset?.title||'공식 멍카드':'',imageUrl:row?asset?.imageUrl||'': '',power:row?.power??null,charm:row?.charm??null,acquiredAt:row?.acquired_at||null};});
  slots.push({slot:5,hidden:true,owned:special,title:special?images.get(5)?.title||'HIDDEN':'',imageUrl:special?images.get(5)?.imageUrl||'':''});
  return Response.json({...base,dog:selected,kind,slots},{headers});
 }catch{return fail();}
}
