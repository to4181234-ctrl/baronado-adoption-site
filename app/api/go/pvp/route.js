import {normalizedPvpInvite} from '../../../../lib/goPvpInvite.js';
import {adminDatabase,validId} from '../../../../lib/server/adminData.js';
import {goError,goMember,goMutationAllowed} from '../../../../lib/server/goAuth.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const enabled=()=>process.env.MEONGGO_STAGE1_COINS_ENABLED==='1' &&
 process.env.MEONGGO_STAGE2_OFFICIAL_ENABLED==='1' &&
 process.env.MEONGGO_STAGE5_PVP_ENABLED==='1';
const error=(message,status=400)=>goError(message,status);
const json=(body,status=200)=>Response.json(body,{status,headers});
const noSecret=(card,imageUrl)=>card?({
 kind:card.kind,cardId:card.cardId,slot:card.slot||null,dogId:card.dogId,
 dogName:card.dogName,title:card.title,power:Number(card.power),
 charm:Number(card.charm),imageUrl
}):null;

async function visualCard(db,card){
 if(!card)return null;
 const bucket=card.kind==='official'?'go-official-cards':'go-cards';
 if(!card.imagePath)return noSecret(card,'');
 // A card may be deleted after a round finishes. Keep the immutable
 // score/history visible even if the old image no longer exists in storage.
 try{
  const {data,error:signError}=await db.storage.from(bucket).createSignedUrl(card.imagePath,900);
  if(signError)return noSecret(card,'');
  return noSecret(card,data?.signedUrl||'');
 }catch{return noSecret(card,'');}
}
async function readRoom(db,memberId,roomId){
 const {data,error:rpcError}=await db.rpc('go_pvp_snapshot',{p_member:memberId,p_room:roomId});
 if(rpcError)throw rpcError;
 if(!data?.ok)return json(data,403);
 const [myCard,otherCard]=await Promise.all([
  visualCard(db,data.myCard),visualCard(db,data.otherCard)
 ]);
 return json({...data,myCard,otherCard});
}
export async function GET(request){
 if(!enabled())return error('친구 멍배틀을 준비 중이에요.',503);
 const member=await goMember(request);if(!member)return error('로그인이 필요해요.',401);
 const url=new URL(request.url);
 const mode=url.searchParams.get('mode')||'history';
 const db=adminDatabase();
 try{
  if(mode==='history'){
   const [wins,draws,losses,recent]=await Promise.all([
    db.from('go_pvp_records').select('id',{count:'exact',head:true})
      .eq('member_id',member.id).eq('outcome','win'),
    db.from('go_pvp_records').select('id',{count:'exact',head:true})
      .eq('member_id',member.id).eq('outcome','draw'),
    db.from('go_pvp_records').select('id',{count:'exact',head:true})
      .eq('member_id',member.id).eq('outcome','loss'),
    db.from('go_pvp_records')
      .select('opponent_name,outcome,finished_at,my_score,opponent_score')
      .eq('member_id',member.id).order('finished_at',{ascending:false})
      .order('id',{ascending:false}).limit(20)
   ]);
   if([wins,draws,losses,recent].some(r=>r.error))throw Error('history query failed');
   return json({stats:{wins:wins.count||0,draws:draws.count||0,losses:losses.count||0},
    recent:(recent.data||[]).map(row=>({
      opponentName:row.opponent_name,outcome:row.outcome,
      finishedAt:row.finished_at,myScore:row.my_score,opponentScore:row.opponent_score
    }))});
  }
  if(mode!=='cards')return error('목록 종류를 확인해주세요.');
  const kind=url.searchParams.get('kind')==='official'?'official':'camera';
  const page=Number(url.searchParams.get('page')||0);
  if(!Number.isInteger(page)||page<0||page>1000)return error('페이지를 확인해주세요.');
  const offset=page*12;
  // Search/sort comes from the approved friend PvP card-picker Figma screen.
  // Keep filters on the server so paging doesn't silently omit search matches.
  const q=(url.searchParams.get('q')||'').slice(0,40).replace(/[^가-힣a-zA-Z0-9 ]/g,'').trim();
  const ascending=url.searchParams.get('order')==='oldest';
  if(kind==='camera'){
   let ownQuery=db.from('go_cards')
    .select('id,dog_id,title,image_path,captured_at',{count:'exact'})
    .eq('member_id',member.id).eq('status','approved');
   if(q){
    const dogsMatching=await db.from('dogs').select('id').ilike('name','%'+q+'%');
    if(dogsMatching.error)throw dogsMatching.error;
    const ids=(dogsMatching.data||[]).map(d=>d.id);
    ownQuery=ownQuery.or('title.ilike.%'+q+'%'+(ids.length?',dog_id.in.('+ids.join(',')+')':''));
   }
   const mine=await ownQuery.order('captured_at',{ascending}).order('id',{ascending})
    .range(offset,offset+11);
   if(mine.error)throw mine.error;
   const rows=mine.data||[],ids=rows.map(c=>c.id);
   if(!rows.length)return json({kind,cards:[],total:mine.count||0,hasMore:false});
   const [stats,dogs,signed]=await Promise.all([
    db.from('go_battle_card_stats').select('card_id,power,charm').in('card_id',ids),
    db.from('dogs').select('id,name').in('id',[...new Set(rows.map(x=>x.dog_id))]),
    db.storage.from('go-cards').createSignedUrls(rows.map(x=>x.image_path),900)
   ]);
   if(stats.error||dogs.error||signed.error)throw Error('camera card images unavailable');
   const statMap=new Map((stats.data||[]).map(x=>[x.card_id,x]));
   const dogMap=new Map((dogs.data||[]).map(x=>[x.id,x.name]));
   const cards=rows.filter(x=>statMap.has(x.id)).map(x=>({
     kind:'camera',cardId:x.id,dogId:x.dog_id,slot:null,
     dogName:dogMap.get(x.dog_id)||'멍멍이',title:x.title,
     power:statMap.get(x.id).power,charm:statMap.get(x.id).charm,
     imageUrl:signed.data[rows.indexOf(x)]?.signedUrl||''
   }));
   return json({kind,cards,total:mine.count||0,hasMore:offset+12<(mine.count||0)});
  }
  // One member can own at most 4 slots for each of the five official dogs.
  // Load this small bounded set so title/dog search precedes pagination.
  const mine=await db.from('go_official_owned')
   .select('dog_id,slot,power,charm,acquired_at',{count:'exact'})
   .eq('member_id',member.id)
   .order('acquired_at',{ascending}).order('dog_id')
   .range(0,99);
  if(mine.error)throw mine.error;
  const rows=mine.data||[],dogIds=[...new Set(rows.map(x=>x.dog_id))];
  if(!rows.length)return json({kind,cards:[],total:mine.count||0,hasMore:false});
  const [dogs,sets]=await Promise.all([
   db.from('dogs').select('id,name').in('id',dogIds),
   db.from('go_official_sets').select('dog_id,current_version').in('dog_id',dogIds)
  ]);
  if(dogs.error||sets.error)throw Error('official dogs unavailable');
  const dogMap=new Map((dogs.data||[]).map(x=>[x.id,x.name]));
  const versions=new Map((sets.data||[]).map(x=>[x.dog_id,x.current_version]));
  const versionIds=[...new Set((sets.data||[]).map(x=>x.current_version).filter(Boolean))];
  const assets=versionIds.length?await db.from('go_official_assets')
    .select('version_id,slot,title,display_path').in('version_id',versionIds)
    .in('slot',[1,2,3,4]):{data:[],error:null};
  if(assets.error)throw assets.error;
  const assetMap=new Map((assets.data||[]).map(x=>[x.version_id+':'+x.slot,x]));
  const visible=rows.map(x=>({row:x,asset:assetMap.get(versions.get(x.dog_id)+':'+x.slot)}))
    .filter(x=>x.asset)
    .filter(x=>!q || (dogMap.get(x.row.dog_id)||'').includes(q) || x.asset.title?.includes(q));
  const filteredTotal=visible.length;
  const pageCards=visible.slice(offset,offset+12);
  const signed=pageCards.length?await db.storage.from('go-official-cards')
    .createSignedUrls(pageCards.map(x=>x.asset.display_path),900):{data:[],error:null};
  if(signed.error)throw signed.error;
  const cards=pageCards.map((x,i)=>({
    kind:'official',cardId:x.row.dog_id,slot:x.row.slot,dogId:x.row.dog_id,
    dogName:dogMap.get(x.row.dog_id)||'멍멍이',title:x.asset.title,
    power:x.row.power,charm:x.row.charm,imageUrl:signed.data[i]?.signedUrl||''
  }));
  return json({kind,cards,total:filteredTotal,hasMore:offset+12<filteredTotal});
 }catch{return error('멍배틀 자료를 불러오지 못했어요.',500);}
}
export async function POST(request){
 if(!enabled())return error('친구 멍배틀을 준비 중이에요.',503);
 const denied=goMutationAllowed(request);if(denied)return denied;
 const member=await goMember(request);if(!member)return error('로그인이 필요해요.',401);
 let body;try{body=await request.json();}catch{return error('대결 요청을 확인해주세요.');}
 const action=body?.action;
 const db=adminDatabase();
 try{
  if(action==='create'){
   const {data, error:rpcError}=await db.rpc('go_pvp_create',{p_member:member.id});
   if(rpcError)throw rpcError;
   if(!data?.ok)return json(data,409);
   return readRoom(db,member.id,data.roomId);
  }
  if(action==='join'){
   const invite=normalizedPvpInvite(body?.invite);
   if(!invite)return error('초대 링크 또는 코드를 확인해주세요.');
   const {data,error:rpcError}=await db.rpc('go_pvp_join',{
    p_member:member.id,p_invite:invite
   });
   if(rpcError)throw rpcError;
   if(!data?.ok)return json(data,409);
   return readRoom(db,member.id,data.roomId);
  }
  if(!validId(body?.roomId) ||
   !['sync','select','ready','unready','rematch','leave'].includes(action))
   return error('참여 중인 방과 작업을 확인해주세요.');
  let kind=null,card=null,slot=null;
  if(action==='select'){
   if(!['camera','official'].includes(body?.kind) || !validId(body?.cardId))
    return error('내 카드 종류와 ID를 확인해주세요.');
   kind=body.kind;card=body.cardId;
   if(kind==='official'&&Number.isInteger(body.slot)&&body.slot>=1&&body.slot<=4)
    slot=body.slot;
   else if(kind==='official'||(body.slot!=null&&kind==='camera'))
    return error('공식 카드 번호를 확인해주세요.');
  }
  const {data,error:rpcError}=await db.rpc('go_pvp_action',{
   p_member:member.id,p_room:body.roomId,p_action:action,
   p_kind:kind,p_card:card,p_slot:slot
  });
  if(rpcError)throw rpcError;
  if(!data?.ok)return json(data,409);
  if(action==='leave')return json(data);
  const room=await readRoom(db,member.id,body.roomId);
  // Attach quest delta only for the actor whose second READY committed the round.
  if(data.coinAdded && room.status===200){
   const payload=await room.json();
   return json({...payload,coinsAdded:data.coinAdded});
  }
  return room;
 }catch{return error('대결 상태를 저장하지 못했어요.',500);}
}
