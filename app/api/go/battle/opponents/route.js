import {goError,goMember} from '../../../../../lib/server/goAuth.js';
import {eligibleBattleOpponents} from '../../../../../lib/server/goBattleMatch.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};

export async function GET(request){
 const member=await goMember(request);
 if(!member)return goError('로그인이 필요해요.',401);
 try{
  const params=new URL(request.url).searchParams;
  const firstId=params.get('firstId');
  const page=Number(params.get('page')||0);
  if(!Number.isInteger(page)||page<0||page>1000)return goError('페이지를 확인해주세요.');
  const search=String(params.get('q')||'').trim().normalize('NFC').slice(0,40).toLocaleLowerCase('ko-KR');
  const data=await eligibleBattleOpponents(member,firstId);
  if(data.error)return goError(data.error,409);
  const filtered=data.opponents.filter(person=>person.nickname.toLocaleLowerCase('ko-KR').includes(search))
   .sort((a,b)=>a.nickname.localeCompare(b.nickname,'ko-KR')||a.id.localeCompare(b.id));
  const start=page*8;
  return Response.json({opponents:filtered.slice(start,start+8),total:filtered.length,hasMore:start+8<filtered.length},{headers:noCache});
 }catch{return goError('대결 상대 목록을 불러오지 못했어요.',500);}
}
