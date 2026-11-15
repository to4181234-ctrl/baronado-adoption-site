import {adminDatabase} from '../../../../../lib/server/adminData.js';
import {goError,goMember} from '../../../../../lib/server/goAuth.js';
import {koreaDay} from '../../../../../lib/goCoins.js';
import {goStage2ServerEnabled} from '../../../../../lib/goOfficial.js';
export const dynamic='force-dynamic';
export async function GET(request){
 if(!goStage2ServerEnabled())return goError('촬영 횟수를 준비 중이에요.',503);
 const member=await goMember(request);
 if(!member)return goError('로그인이 필요해요.',401);
 try{
  const day=koreaDay();
  const {count,error}=await adminDatabase().from('go_camera_daily_creations')
   .select('card_id',{count:'exact',head:true})
   .eq('member_id',member.id).eq('local_day',day);
  if(error)throw error;
  const used=count||0;
  return Response.json({day,used,remaining:Math.max(0,3-used),limit:3},
   {headers:{'Cache-Control':'no-store'}});
 }catch{return goError('오늘의 촬영 횟수를 확인하지 못했어요.',500);}
}
