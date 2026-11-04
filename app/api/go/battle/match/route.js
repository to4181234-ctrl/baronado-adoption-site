import {randomInt} from 'node:crypto';
import {adminDatabase,validId} from '../../../../../lib/server/adminData.js';
import {goError,goMember,goMutationAllowed} from '../../../../../lib/server/goAuth.js';
import {eligibleBattleOpponents,makeBattleTicket} from '../../../../../lib/server/goBattleMatch.js';
import {loadGoCards} from '../../../../../lib/server/goCards.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);

export async function POST(request){
 const blocked=goMutationAllowed(request);
 if(blocked)return blocked;
 const member=await goMember(request);
 if(!member)return goError('로그인이 필요해요.',401);
 let body;
 try{body=await request.json();}catch{return goError('대결 정보를 확인해주세요.');}
 const {id,firstId,opponentId=null}=body||{};
 if(!uuid(id)||!validId(firstId)||(opponentId!==null&&!validId(opponentId)))return goError('대결 정보를 확인해주세요.');
 try{
  const db=adminDatabase();
  const prior=await db.from('go_battles').select('id').eq('id',id).maybeSingle();
  if(prior.error)throw prior.error;
  if(prior.data)return goError('이미 완료된 대결이에요. 새로 시작해주세요.',409);
  const data=await eligibleBattleOpponents(member,firstId,opponentId);
  if(data.error)return goError(data.error,409);
  if(!data.opponents.length)return goError('대결할 수 있는 멍기록가가 없어요. 다른 카드를 골라주세요.',409);
  const person=opponentId?data.opponents.find(p=>p.id===opponentId):data.opponents[randomInt(data.opponents.length)];
  if(!person)return goError('선택한 멍기록가는 지금 대결할 수 없어요.',409);
  const candidates=data.cardsByMember.get(person.id)||[];
  if(!candidates.length)return goError('상대방에게 대결 가능한 카드가 없어요.',409);
  const secondId=candidates[randomInt(candidates.length)].id;
  // Fetch the original Figma card's signed photo and stats, not a recreated illustration.
  const cardData=await loadGoCards({member,ids:[secondId],limit:1});
  const card=cardData.cards[0];
  if(!card||!card.battle)return goError('상대 카드가 변경됐어요. 다시 시도해주세요.',409);
  const ticket=makeBattleTicket({id,firstId,secondId,memberId:member.id});
  return Response.json({id,firstId,secondId,opponent:person,card,ticket},{headers:noCache});
 }catch{return goError('랜덤 멍배틀을 준비하지 못했어요.',500);}
}
