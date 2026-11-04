import { adminDatabase, validId } from '../../../../lib/server/adminData.js';
import { goError, goMember, goMutationAllowed } from '../../../../lib/server/goAuth.js';
import { loadGoCards } from '../../../../lib/server/goCards.js';
import { battleScore } from '../../../../lib/goBattleRules.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const uuid = x => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const noCache = { 'Cache-Control': 'no-store' };
// Cards uploaded by members are visible by default; only the existing approved status
// and battle stats determine whether they can join a battle. No public/private flag.
async function eligibleOpponents(db,member,ownDogId){
 const cards=[];
 for(let offset=0;offset<10000;offset+=500){
  let q=db.from('go_card_index').select('id,member_id,nickname,dog_id').eq('status','approved').neq('member_id',member.id).order('id').range(offset,offset+499);
  if(ownDogId)q=q.neq('dog_id',ownDogId);
  const r=await q;if(r.error)throw r.error;
  cards.push(...(r.data||[]));if((r.data||[]).length<500)break;
 }
 const valid=[];
 for(let i=0;i<cards.length;i+=250){
  const batch=cards.slice(i,i+250);
  const r=await db.from('go_battle_card_stats').select('card_id').in('card_id',batch.map(c=>c.id));
  if(r.error)throw r.error;
  const ids=new Set((r.data||[]).map(c=>c.card_id));
  valid.push(...batch.filter(c=>ids.has(c.id)));
 }
 const members=new Map();
 for(const card of valid){
  const entry=members.get(card.member_id)||{id:card.member_id,nickname:card.nickname||'멍기록가',cardCount:0};
  entry.cardCount++;members.set(card.member_id,entry);
 }
 return {cards:valid,members:[...members.values()].sort((a,b)=>a.nickname.localeCompare(b.nickname,'ko'))};
}
function randomIndex(max){
 if(max<=1)return 0;
 const buf=new Uint32Array(1);const ceiling=Math.floor(0x100000000/max)*max;
 do{crypto.getRandomValues(buf)}while(buf[0]>=ceiling);
 return buf[0]%max;
}

export async function GET(request) {
 try {
  const member = await goMember(request);
  const url = new URL(request.url);
  const mine = url.searchParams.get('mine') === '1';
  if(url.searchParams.get('mode')==='opponents'){
   if(!member)return goError('로그인이 필요해요.',401);
   const ownCardId=url.searchParams.get('ownCardId');
   if(!validId(ownCardId))return goError('내 카드를 먼저 선택해주세요.');
   const db=adminDatabase();
   const own=await db.from('go_cards').select('dog_id,status,member_id').eq('id',ownCardId).maybeSingle();
   if(own.error)throw own.error;
   if(!own.data||own.data.member_id!==member.id||own.data.status!=='approved')return goError('내 출전 카드를 확인해주세요.',403);
   const eligible=await eligibleOpponents(db,member,own.data.dog_id);
   const q=String(url.searchParams.get('q')||'').trim().toLocaleLowerCase('ko');
   const filtered=eligible.members.filter(m=>m.nickname.toLocaleLowerCase('ko').includes(q));
   const page=Number(url.searchParams.get('page')||'0');
   if(!Number.isInteger(page)||page<0||page>1000)return goError('페이지를 확인해주세요.');
   return Response.json({members:filtered.slice(page*12,page*12+12),total:filtered.length,hasMore:(page+1)*12<filtered.length},{headers:noCache});
  }
  if (mine && !member) return goError('로그인이 필요해요.',401);
  const page = Number(url.searchParams.get('page') || '0');
  if (!Number.isInteger(page) || page < 0 || page > 1000) return goError('페이지를 확인해주세요.');
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
  return Response.json({...result,eligibleDogKinds,cards:result.cards.map(c=>({...c,battle:byId.get(c.id)||null}))},{headers:noCache});
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
  if(!validId(firstId))return goError('내 카드를 먼저 선택해주세요.');
  try{
   const db=adminDatabase();
   const own=await db.from('go_cards').select('id,dog_id,status,member_id').eq('id',firstId).maybeSingle();
   if(own.error)throw own.error;
   if(!own.data||own.data.member_id!==member.id||own.data.status!=='approved')return goError('내 출전 카드를 확인해주세요.',403);
   const {cards,members}=await eligibleOpponents(db,member,own.data.dog_id);
   const target=input.randomMember?members[randomIndex(members.length)]?.id:input.opponentId;
   if(!validId(target)||target===member.id)return goError('대결 가능한 멍기록가를 선택해주세요.',409);
   const pool=cards.filter(c=>c.member_id===target);
   if(!pool.length)return goError('상대 멍기록가의 대결 가능한 카드가 없어요.',409);
   const picked=pool[randomIndex(pool.length)];
   const found=await loadGoCards({member,id:picked.id,limit:1});
   if(!found.cards[0]?.battle)return goError('상대 카드를 다시 선택해주세요.',409);
   return Response.json({opponent:members.find(m=>m.id===target),card:found.cards[0]},{headers:noCache});
  }catch{return goError('상대 카드를 준비하지 못했어요.',500);}
 }
 if(!uuid(id)||!validId(firstId)||!validId(secondId)||firstId===secondId)return goError('서로 다른 카드를 선택해주세요.');
 try{
  const db=adminDatabase();
  const prior=await db.from('go_battles').select('*').eq('id',id).maybeSingle();
  if(prior.error)throw prior.error;
  if(prior.data) {
   if(prior.data.member_id!==member.id)return goError('대결 정보를 확인해주세요.',403);
   return Response.json({battle:prior.data,replayed:true},{headers:noCache});
  }
  const cards=await db.from('go_cards').select('id,dog_id,status,member_id').in('id',[firstId,secondId]);
  if(cards.error)throw cards.error;
  const byId=new Map((cards.data||[]).map(c=>[c.id,c]));
  const first=byId.get(firstId),second=byId.get(secondId);
  if(!first||!second||first.status!=='approved'||second.status!=='approved')return goError('관리자에 의해 제한되었거나 삭제된 카드가 있어요.',409);
  if(first.dog_id===second.dog_id)return goError('서로 다른 강아지의 카드를 선택해주세요.',409);
  if((first.member_id===member.id)===(second.member_id===member.id))
   return goError('내 카드 한 장과 다른 사람의 카드 한 장을 선택해주세요.',409);
  const stats=await db.from('go_battle_card_stats').select('card_id,power,charm,element').in('card_id',[firstId,secondId]);
  if(stats.error)throw stats.error;
  const byCard=new Map((stats.data||[]).map(s=>[s.card_id,s]));
  const a=byCard.get(firstId),b=byCard.get(secondId);
  if(!a||!b)return goError('카드 능력치를 준비 중이에요.',409);
  const {bonusA,bonusB,scoreA,scoreB,winner}=battleScore(a,b);
  const row={
   id,member_id:member.id,first_card_id:firstId,second_card_id:secondId,
   first_dog_id:first.dog_id,second_dog_id:second.dog_id,
   first_power:a.power,first_charm:a.charm,first_element:a.element,first_bonus:bonusA,first_score:scoreA,
   second_power:b.power,second_charm:b.charm,second_element:b.element,second_bonus:bonusB,second_score:scoreB,
   winner
  };
  const saved=await db.from('go_battles').upsert(row,{onConflict:'id',ignoreDuplicates:true});
  if(saved.error)throw saved.error;
  const checked=await db.from('go_battles').select('*').eq('id',id).single();
  if(checked.error)throw checked.error;
  if(checked.data.member_id!==member.id)return goError('대결 정보를 확인해주세요.',403);
  return Response.json({battle:checked.data},{status:201,headers:noCache});
 }catch{return goError('대결 기록을 저장하지 못했어요.',500);}
}
