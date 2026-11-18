import {randomInt,randomUUID,timingSafeEqual} from 'node:crypto';
import { adminDatabase, validId } from '../../../../lib/server/adminData.js';
import { goError, goMember, goMutationAllowed, scopedSignature } from '../../../../lib/server/goAuth.js';
import { loadGoCards } from '../../../../lib/server/goCards.js';
import { battleScore } from '../../../../lib/goBattleRules.js';
import {listOfficialBattleCards,getOfficialOwned,officialCardFace,parseBattleIdentity} from '../../../../lib/server/goBattleOfficial.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const uuid = x => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const noCache = { 'Cache-Control': 'no-store' };
const MATCH_TTL_MS=10*60*1000;
const stage5=()=>process.env.MEONGGO_STAGE5_PVP_ENABLED==='1' &&
 process.env.MEONGGO_STAGE1_COINS_ENABLED==='1';
async function battleQuest(db,memberId,battleId){
 if(!stage5())return {coinsAdded:0};
 const r=await db.rpc('go_battle_reward_random',{p_member:memberId,p_battle:battleId});
 if(r.error||!r.data?.ok)throw Error('battle daily quest reward');
 return {coinsAdded:Number(r.data.coinsAdded)||0};
}

function matchToken(id,memberId,first,second,secondOwner,expires){
 const message=[id,memberId,first.id,first.kind,first.slot||0,second.id,second.kind,second.slot||0,secondOwner,expires].join(':');
 return String(expires)+'.'+scopedSignature(message,'meonggo-random-opponent-v2');
}
function validMatchToken(value,id,memberId,first,second,secondOwner){
 if(typeof value!=='string'||value.length>256)return false;
 const expires=Number(value.split('.')[0]);
 if(!Number.isSafeInteger(expires)||expires<Date.now()||expires>Date.now()+MATCH_TTL_MS)return false;
 const expected=Buffer.from(matchToken(id,memberId,first,second,secondOwner,expires));
 const actual=Buffer.from(value);
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
const identity=(body,prefix)=>parseBattleIdentity(body,prefix,validId);
async function readOwned(db,memberId,ref){
 if(!ref)return null;
 if(ref.kind==='official')return getOfficialOwned(db,memberId,ref.id,ref.slot);
 const own=await db.from('go_cards').select('id,dog_id,status,member_id')
  .eq('id',ref.id).eq('member_id',memberId).maybeSingle();
 if(own.error)throw own.error;
 if(!own.data||own.data.status!=='approved')return null;
 const stats=await db.from('go_battle_card_stats').select('power,charm,element')
  .eq('card_id',ref.id).maybeSingle();
 if(stats.error)throw stats.error;
 return stats.data?{...own.data,kind:'camera',slot:null,power:stats.data.power,charm:stats.data.charm,element:stats.data.element}:null;
}
// Cards uploaded by members are visible by default; only the existing approved status
// and battle stats determine whether they can join a battle. No public/private flag.
async function eligibleOpponents(db,member,ownDogId){
 const cards=[];
 let complete=false;
 for(let offset=0;offset<10000;offset+=500){
  let q=db.from('go_card_index').select('id,member_id,nickname,dog_id').eq('status','approved').neq('member_id',member.id).order('id').range(offset,offset+499);
  if(ownDogId)q=q.neq('dog_id',ownDogId);
  const r=await q;if(r.error)throw r.error;
  cards.push(...(r.data||[]));if((r.data||[]).length<500){complete=true;break;}
 }
 if(!complete)throw Error('대결 가능한 카드가 많아 목록을 확인하지 못했어요.');
 const valid=[];
 for(let i=0;i<cards.length;i+=250){
  const batch=cards.slice(i,i+250);
  const r=await db.from('go_battle_card_stats').select('card_id').in('card_id',batch.map(c=>c.id));
  if(r.error)throw r.error;
  const ids=new Set((r.data||[]).map(c=>c.card_id));
  valid.push(...batch.filter(c=>ids.has(c.id)).map(c=>({...c,kind:'camera',slot:null})));
 }
 // Published, owned official cards are eligible opponents too (including HIDDEN NO.5).
 for(const [table,slotFromRow] of [['go_official_owned',true],['go_official_hidden',false]]){
  for(let offset=0;offset<10000;offset+=500){
   let q=db.from(table).select(slotFromRow?'member_id,dog_id,slot,power,charm':'member_id,dog_id,power,charm')
    .neq('member_id',member.id).order('member_id').order('dog_id');
   if(slotFromRow)q=q.order('slot');
   q=q.range(offset,offset+499);
   if(ownDogId)q=q.neq('dog_id',ownDogId);
   const r=await q;if(r.error)throw r.error;
   for(const row of r.data||[]){
    if(Number(row.power)>=1&&Number(row.power)<=5&&Number(row.charm)>=1&&Number(row.charm)<=5)
     valid.push({id:row.dog_id,dog_id:row.dog_id,member_id:row.member_id,kind:'official',slot:slotFromRow?row.slot:5});
   }
   if((r.data||[]).length<500)break;
   if(offset>=9500)throw Error('Too many official cards');
  }
 }
 const members=new Map();
 for(const card of valid){
  const entry=members.get(card.member_id)||{id:card.member_id,nickname:card.nickname||'멍기록가',cardCount:0};
  entry.cardCount++;members.set(card.member_id,entry);
 }
 // Use existing account profiles only. Disabled recorders cannot be matched.
 const profiles=new Map(),memberIds=[...members.keys()];
 for(let i=0;i<memberIds.length;i+=100){
  const result=await db.from('go_members').select('id,nickname,avatar_dog')
   .in('id',memberIds.slice(i,i+100)).eq('disabled',false);
  if(result.error)throw result.error;
  for(const profile of result.data||[])profiles.set(profile.id,profile);
 }
 const enabled=[...members.values()].filter(m=>profiles.has(m.id)).map(m=>{
  const p=profiles.get(m.id);
  return {...m,nickname:p.nickname,avatarDog:p.avatar_dog||null};
 }).sort((a,b)=>a.nickname.localeCompare(b.nickname,'ko'));
 return {cards:valid.filter(c=>profiles.has(c.member_id)),members:enabled};
}
function randomIndex(max){return max<=1?0:randomInt(max);}

export async function GET(request) {
 try {
  const member = await goMember(request);
  const url = new URL(request.url);
  const mine = url.searchParams.get('mine') === '1';
  if(url.searchParams.get('mode')==='opponents'){
   if(!member)return goError('로그인이 필요해요.',401);
   const ref=identity({firstId:url.searchParams.get('ownCardId'),firstKind:url.searchParams.get('ownKind'),firstSlot:url.searchParams.get('ownSlot')},'first');
   if(!ref)return goError('내 카드를 먼저 선택해주세요.');
   const db=adminDatabase();
   const own=await readOwned(db,member.id,ref);
   if(!own)return goError('내 출전 카드를 확인해주세요.',403);
   const eligible=await eligibleOpponents(db,member,own.dog_id);
   const q=String(url.searchParams.get('q')||'').trim().toLocaleLowerCase('ko');
   const filtered=eligible.members.filter(m=>m.nickname.toLocaleLowerCase('ko').includes(q));
   const page=Number(url.searchParams.get('page')||'0');
   if(!Number.isInteger(page)||page<0||page>1000)return goError('페이지를 확인해주세요.');
   return Response.json({members:filtered.slice(page*12,page*12+12),total:filtered.length,hasMore:(page+1)*12<filtered.length},{headers:noCache});
  }
  if (mine && !member) return goError('로그인이 필요해요.',401);
  const page = Number(url.searchParams.get('page') || '0');
  if (!Number.isInteger(page) || page < 0 || page > 1000) return goError('페이지를 확인해주세요.');
  if(mine&&url.searchParams.get('kind')==='official'){
   const d=await listOfficialBattleCards(adminDatabase(),member, String(url.searchParams.get('q')||'').slice(0,80),url.searchParams.get('order')==='oldest'?'oldest':'newest',page);
   return Response.json({...d,eligibleDogKinds:0},{headers:noCache});
  }
  const result = await loadGoCards({
   member, mine, excludeOwn: !mine, page, limit: 4,
   query: String(url.searchParams.get('q') || '').slice(0,80),
   order: url.searchParams.get('order') === 'oldest' ? 'oldest' : 'newest'
  });
  const db=adminDatabase();
  // Count distinct eligible dogs without relying on one page of cards.
  // Two species are enough for the battle-eligibility decision.
  let available=db.from('go_cards').select('dog_id').eq('status','approved');
  if(mine)available=available.eq('member_id',member.id);
  const firstKind=await available.limit(1);
  if(firstKind.error)throw firstKind.error;
  let eligibleDogKinds=0;
  if(firstKind.data?.length){
   eligibleDogKinds=1;
   let other=db.from('go_cards').select('dog_id').eq('status','approved').neq('dog_id',firstKind.data[0].dog_id);
   if(mine)other=other.eq('member_id',member.id);
   const secondKind=await other.limit(1);
   if(secondKind.error)throw secondKind.error;
   if(secondKind.data?.length)eligibleDogKinds=2;
  }
  const ids=result.cards.map(c=>c.id);
  const rows=ids.length?await db.from('go_battle_card_stats').select('card_id,power,charm,element').in('card_id',ids):{data:[],error:null};
  if (rows.error) throw rows.error;
  const byId=new Map((rows.data||[]).map(s=>[s.card_id,s]));
  return Response.json({...result,eligibleDogKinds,cards:result.cards.map(c=>({...c,kind:'camera',slot:null,battle:byId.get(c.id)||null}))},{headers:noCache});
 } catch { return goError('멍배틀 카드를 불러오지 못했어요.',500); }
}

export async function POST(request) {
 const blocked=goMutationAllowed(request);
 if(blocked)return blocked;
 const member=await goMember(request);
 if(!member)return goError('로그인이 필요해요.',401);
 let input;
 try { input=await request.json(); } catch { return goError('대결 정보를 확인해주세요.'); }
 const {id,firstId,secondId}=input||{};
 if(input?.action==='prepare'){
  const ownRef=identity(input,'first');
  if(!ownRef)return goError('내 카드를 먼저 선택해주세요.');
  try{
   const db=adminDatabase();
   const own=await readOwned(db,member.id,ownRef);
   if(!own)return goError('내 출전 카드를 확인해주세요.',403);
   const {cards,members}=await eligibleOpponents(db,member,own.dog_id);
   const target=input.randomMember?members[randomIndex(members.length)]?.id:input.opponentId;
   if(!validId(target)||target===member.id)return goError('대결 가능한 멍기록가를 선택해주세요.',409);
   const pool=cards.filter(c=>c.member_id===target);
   if(!pool.length)return goError('상대 멍기록가의 대결 가능한 카드가 없어요.',409);
   const picked=pool[randomIndex(pool.length)];
   const opponentRef={id:picked.id,kind:picked.kind,slot:picked.slot};
   const card=picked.kind==='official'?
    await officialCardFace(db,await getOfficialOwned(db,target,picked.id,picked.slot)):
    (await loadGoCards({member,id:picked.id,limit:1})).cards[0];
   if(!card?.battle)return goError('상대 카드를 다시 선택해주세요.',409);
   card.kind=picked.kind;card.slot=picked.slot;card.ownerId=target;
   const battleId=randomUUID(),expires=Date.now()+MATCH_TTL_MS;
   return Response.json({
    opponent:members.find(m=>m.id===target),card,
    battleId,matchToken:matchToken(battleId,member.id,ownRef,opponentRef,target,expires)
   },{headers:noCache});
  }catch{return goError('상대 카드를 준비하지 못했어요.',500);}
 }
 const firstRef=identity(input,'first'),secondRef=identity(input,'second');
 const secondOwner=input?.secondOwnerId;
 if(!uuid(id)||!firstRef||!secondRef||!validId(secondOwner)||secondOwner===member.id||firstId===secondId)
  return goError('서로 다른 카드를 선택해주세요.');
 if(!validMatchToken(input?.matchToken,id,member.id,firstRef,secondRef,secondOwner))
  return goError('배틀 준비 정보가 만료됐어요. 상대를 다시 선택해주세요.',403);
 try{
  const db=adminDatabase();
  const prior=await db.from('go_battles').select('*').eq('id',id).maybeSingle();
  if(prior.error)throw prior.error;
  if(prior.data) {
   if(prior.data.member_id!==member.id||prior.data.first_card_id!==firstId||prior.data.second_card_id!==secondId||
      (prior.data.first_kind||'camera')!==firstRef.kind||(prior.data.second_kind||'camera')!==secondRef.kind||
      (prior.data.first_slot??null)!==firstRef.slot||(prior.data.second_slot??null)!==secondRef.slot)return goError('대결 정보를 확인해주세요.',403);
   const reward=await battleQuest(db,member.id,id);
   return Response.json({battle:prior.data,replayed:true,...reward},{headers:noCache});
  }
  const first=await readOwned(db,member.id,firstRef);
  const second=await readOwned(db,secondOwner,secondRef);
  if(!first||!second)return goError('관리자에 의해 제한되었거나 삭제된 카드가 있어요.',409);
  if(first.dog_id===second.dog_id)return goError('서로 다른 강아지의 카드를 선택해주세요.',409);
  const a={power:first.power,charm:first.charm,element:first.element},
        b={power:second.power,charm:second.charm,element:second.element};
  if(firstRef.kind==='official'||secondRef.kind==='official'){
   const [dogA,dogB]=await Promise.all([
    db.from('dogs').select('name').eq('id',first.dog_id).maybeSingle(),
    db.from('dogs').select('name').eq('id',second.dog_id).maybeSingle()
   ]);
   if(dogA.error||dogB.error||!dogA.data||!dogB.data)throw Error('dog element lookup');
   const {gameElement}=await import('../../../../lib/goV3Game.js');
   if(firstRef.kind==='official')a.element=gameElement(dogA.data.name);
   if(secondRef.kind==='official')b.element=gameElement(dogB.data.name);
  }
  const {bonusA,bonusB,scoreA,scoreB,winner}=battleScore(a,b);
  const row={
   id,member_id:member.id,first_card_id:firstId,second_card_id:secondId,
   ...(firstRef.kind==='official'||secondRef.kind==='official'?{first_kind:firstRef.kind,first_slot:firstRef.slot,second_kind:secondRef.kind,second_slot:secondRef.slot}:{}),
   first_dog_id:first.dog_id,second_dog_id:second.dog_id,
   first_power:a.power,first_charm:a.charm,first_element:a.element,first_bonus:bonusA,first_score:scoreA,
   second_power:b.power,second_charm:b.charm,second_element:b.element,second_bonus:bonusB,second_score:scoreB,
   winner
  };
  const saved=await db.from('go_battles').upsert(row,{onConflict:'id',ignoreDuplicates:true});
  if(saved.error)throw saved.error;
  const checked=await db.from('go_battles').select('*').eq('id',id).single();
  if(checked.error)throw checked.error;
  if(checked.data.member_id!==member.id||checked.data.first_card_id!==firstId||checked.data.second_card_id!==secondId)return goError('대결 정보를 확인해주세요.',403);
  const reward=await battleQuest(db,member.id,id);
  return Response.json({battle:checked.data,...reward},{status:201,headers:noCache});
 }catch{return goError('대결 기록을 저장하지 못했어요.',500);}
}
