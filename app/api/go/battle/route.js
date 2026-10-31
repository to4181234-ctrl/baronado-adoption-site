import { adminDatabase, validId } from '../../../../lib/server/adminData.js';
import { goError, goMember, goMutationAllowed } from '../../../../lib/server/goAuth.js';
import { loadGoCards } from '../../../../lib/server/goCards.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const ADVANTAGE = ['햇살','숲','물결','별빛','온기','꿈결'];
const uuid = x => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const noCache = { 'Cache-Control': 'no-store' };

export async function GET(request) {
 try {
  const member = await goMember(request);
  const url = new URL(request.url);
  const mine = url.searchParams.get('mine') === '1';
  if (mine && !member) return goError('로그인이 필요해요.',401);
  const page = Number(url.searchParams.get('page') || '0');
  if (!Number.isInteger(page) || page < 0 || page > 1000) return goError('페이지를 확인해주세요.');
  const result = await loadGoCards({
   member, mine, page, limit: 4,
   query: String(url.searchParams.get('q') || '').slice(0,80),
   order: url.searchParams.get('order') === 'oldest' ? 'oldest' : 'newest'
  });
  const db=adminDatabase();
  const ids=result.cards.map(c=>c.id);
  const rows=ids.length?await db.from('go_battle_card_stats').select('card_id,power,charm,element').in('card_id',ids):{data:[],error:null};
  if (rows.error) throw rows.error;
  const byId=new Map((rows.data||[]).map(s=>[s.card_id,s]));
  return Response.json({...result,cards:result.cards.map(c=>({...c,battle:byId.get(c.id)||null}))},{headers:noCache});
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
 if(!uuid(id)||!validId(firstId)||!validId(secondId)||firstId===secondId)return goError('서로 다른 카드를 선택해주세요.');
 try{
  const db=adminDatabase();
  const prior=await db.from('go_battles').select('*').eq('id',id).maybeSingle();
  if(prior.error)throw prior.error;
  if(prior.data) {
   if(prior.data.member_id!==member.id)return goError('대결 정보를 확인해주세요.',403);
   return Response.json({battle:prior.data,replayed:true},{headers:noCache});
  }
  const cards=await db.from('go_cards').select('id,dog_id,status').in('id',[firstId,secondId]);
  if(cards.error)throw cards.error;
  const byId=new Map((cards.data||[]).map(c=>[c.id,c]));
  const first=byId.get(firstId),second=byId.get(secondId);
  if(!first||!second||first.status!=='approved'||second.status!=='approved')return goError('삭제되거나 비공개 처리된 카드가 있어요.',409);
  if(first.dog_id===second.dog_id)return goError('서로 다른 강아지의 카드를 선택해주세요.',409);
  const stats=await db.from('go_battle_card_stats').select('card_id,power,charm,element').in('card_id',[firstId,secondId]);
  if(stats.error)throw stats.error;
  const byCard=new Map((stats.data||[]).map(s=>[s.card_id,s]));
  const a=byCard.get(firstId),b=byCard.get(secondId);
  if(!a||!b)return goError('카드 능력치를 준비 중이에요.',409);
  const nextA=ADVANTAGE[(ADVANTAGE.indexOf(a.element)+1)%ADVANTAGE.length];
  const nextB=ADVANTAGE[(ADVANTAGE.indexOf(b.element)+1)%ADVANTAGE.length];
  const bonusA=nextA===b.element?2:0;
  const bonusB=nextB===a.element?2:0;
  const scoreA=Number(a.power)+Number(a.charm)+bonusA;
  const scoreB=Number(b.power)+Number(b.charm)+bonusB;
  const row={
   id,member_id:member.id,first_card_id:firstId,second_card_id:secondId,
   first_dog_id:first.dog_id,second_dog_id:second.dog_id,
   first_power:a.power,first_charm:a.charm,first_element:a.element,first_bonus:bonusA,first_score:scoreA,
   second_power:b.power,second_charm:b.charm,second_element:b.element,second_bonus:bonusB,second_score:scoreB,
   winner:scoreA===scoreB?'draw':scoreA>scoreB?'first':'second'
  };
  const saved=await db.from('go_battles').upsert(row,{onConflict:'id',ignoreDuplicates:true});
  if(saved.error)throw saved.error;
  const checked=await db.from('go_battles').select('*').eq('id',id).single();
  if(checked.error)throw checked.error;
  if(checked.data.member_id!==member.id)return goError('대결 정보를 확인해주세요.',403);
  return Response.json({battle:checked.data},{status:201,headers:noCache});
 }catch{return goError('대결 기록을 저장하지 못했어요.',500);}
}
