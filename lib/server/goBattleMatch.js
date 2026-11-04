import {timingSafeEqual} from 'node:crypto';
import {adminDatabase,validId} from './adminData.js';
import {scopedSignature} from './goAuth.js';

const PAGE=400,MAX_CARDS=20000,TICKET_LIFETIME=15*60;

// Only approved cards already used by the site's existing public card flow.
// No per-user public/private setting or database migration is introduced.
export async function eligibleBattleOpponents(member,firstId,requestedOpponentId=null){
 if(!member||!validId(firstId))return {error:'내 카드를 먼저 선택해주세요.'};
 const db=adminDatabase();
 const own=await db.from('go_cards').select('id,dog_id,member_id,status').eq('id',firstId).maybeSingle();
 if(own.error)throw own.error;
 if(!own.data||own.data.member_id!==member.id||own.data.status!=='approved')return {error:'대결 가능한 내 카드를 다시 선택해주세요.'};
 const ownStats=await db.from('go_battle_card_stats').select('card_id').eq('card_id',firstId).maybeSingle();
 if(ownStats.error)throw ownStats.error;
 if(!ownStats.data)return {error:'카드 능력치를 준비 중이에요.'};
 if(requestedOpponentId!==null&&(!validId(requestedOpponentId)||requestedOpponentId===member.id))return {error:'다른 멍기록가를 선택해주세요.'};

 const candidates=[];
 for(let offset=0;offset<MAX_CARDS;offset+=PAGE){
  let query=db.from('go_cards').select('id,dog_id,member_id').eq('status','approved')
   .neq('member_id',member.id).neq('dog_id',own.data.dog_id).order('id').range(offset,offset+PAGE-1);
  if(requestedOpponentId)query=query.eq('member_id',requestedOpponentId);
  const result=await query;
  if(result.error)throw result.error;
  const rows=result.data||[];
  if(rows.length){
   const found=await db.from('go_battle_card_stats').select('card_id').in('card_id',rows.map(card=>card.id));
   if(found.error)throw found.error;
   const allowed=new Set((found.data||[]).map(row=>row.card_id));
   candidates.push(...rows.filter(card=>allowed.has(card.id)));
  }
  if(rows.length<PAGE)break;
  if(offset+PAGE>=MAX_CARDS)throw Error('대결 상대가 많아 조회를 완료할 수 없어요.');
 }
 if(!candidates.length)return {own:own.data,opponents:[],cardsByMember:new Map()};
 const ids=[...new Set(candidates.map(card=>card.member_id))];
 const opponents=[];
 for(let offset=0;offset<ids.length;offset+=100){
  const users=await db.from('go_members').select('id,nickname,avatar_dog').eq('disabled',false).in('id',ids.slice(offset,offset+100));
  if(users.error)throw users.error;
  opponents.push(...(users.data||[]));
 }
 const membersById=new Map(opponents.map(person=>[person.id,person]));
 const cardsByMember=new Map();
 for(const card of candidates){
  if(!membersById.has(card.member_id))continue;
  if(!cardsByMember.has(card.member_id))cardsByMember.set(card.member_id,[]);
  cardsByMember.get(card.member_id).push(card);
 }
 return {
  own:own.data,
  opponents:opponents.filter(person=>cardsByMember.has(person.id)).map(person=>({
   id:person.id,nickname:person.nickname,avatarDog:person.avatar_dog||null,
   eligibleCards:cardsByMember.get(person.id).length
  })),
  cardsByMember
 };
}

function ticketContent({id,firstId,secondId,memberId,expires}){
 return [id,firstId,secondId,memberId,expires].join(':');
}
export function makeBattleTicket({id,firstId,secondId,memberId}){
 const expires=Math.floor(Date.now()/1000)+TICKET_LIFETIME;
 const body=ticketContent({id,firstId,secondId,memberId,expires});
 return expires+'.'+scopedSignature(body,'meonggo-battle-match-v1');
}
export function verifyBattleTicket(ticket,{id,firstId,secondId,memberId}){
 if(typeof ticket!=='string'||ticket.length>150)return false;
 const parts=ticket.split('.');
 if(parts.length!==2||!/^\d{10}$/.test(parts[0])||!/^[A-Za-z0-9_-]{43}$/.test(parts[1]))return false;
 const expires=Number(parts[0]),now=Math.floor(Date.now()/1000);
 if(!Number.isSafeInteger(expires)||expires<now||expires>now+TICKET_LIFETIME)return false;
 const expected=scopedSignature(ticketContent({id,firstId,secondId,memberId,expires}),'meonggo-battle-match-v1');
 const actualBytes=Buffer.from(parts[1]),expectedBytes=Buffer.from(expected);
 return actualBytes.length===expectedBytes.length&&timingSafeEqual(actualBytes,expectedBytes);
}
