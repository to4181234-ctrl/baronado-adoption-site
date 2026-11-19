import {gameElement} from '../goV3Game.js';
import {releasedDogs} from './goDogRelease.js';

/** Official owned-card identity is (memberId,dogId,slot), not go_cards.id. */
export const battleCardKey=card=>`${card?.kind||'camera'}:${card?.id||''}:${card?.slot||0}`;
const SCORE_VALID=n=>Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<=5;
export function validBattleSlot(kind,slot){return kind==='camera'?slot==null:kind==='official'&&Number.isInteger(slot)&&slot>=1&&slot<=5;}
/** Parse a user's selected battle card. Legacy custom cards may omit Kind,
 * but unrecognized types and ambiguous slot values must never be downgraded
 * silently into a custom-card request. */
export function parseBattleIdentity(body,prefix,validId){
 if(!body||typeof body!=='object')return null;
 const rawKind=body[prefix+'Kind'];
 if(rawKind!=null&&rawKind!=='camera'&&rawKind!=='official')return null;
 const kind=rawKind??'camera',rawSlot=body[prefix+'Slot'];
 if(kind==='camera'&&rawSlot!=null&&rawSlot!=='')return null;
 const slot=kind==='official'&&(
  (typeof rawSlot==='number'&&Number.isInteger(rawSlot))||
  (typeof rawSlot==='string'&&/^[1-5]$/.test(rawSlot))
 )?Number(rawSlot):kind==='official'?NaN:null;
 const id=body[prefix+'Id'];
 return validId(id)&&validBattleSlot(kind,slot)?{id,kind,slot}:null;
}
export async function getOfficialOwned(db,memberId,dogId,slot){
 if(!memberId||!dogId||!Number.isInteger(slot)||slot<1||slot>5)return null;
 const q=slot===5?
  db.from('go_official_hidden').select('dog_id,power,charm,unlocked_at').eq('member_id',memberId).eq('dog_id',dogId):
  db.from('go_official_owned').select('dog_id,slot,power,charm,acquired_at').eq('member_id',memberId).eq('dog_id',dogId).eq('slot',slot);
 const {data,error}=await q.maybeSingle();if(error)throw error;
 if(!data||!SCORE_VALID(data.power)||!SCORE_VALID(data.charm)||!(await releasedDogs(db)).has(dogId))return null;
 return {...data,member_id:memberId,dog_id:dogId,slot,kind:'official',id:dogId};
}
export async function officialCardFace(db,record){
 if(!record)return null;
 const [dog,set]=await Promise.all([
  db.from('dogs').select('id,name').eq('id',record.dog_id).maybeSingle(),
  db.from('go_official_sets').select('current_version').eq('dog_id',record.dog_id).maybeSingle()
 ]);
 if(dog.error||set.error)throw Error('official card lookup');
 if(!dog.data||!set.data?.current_version||!(await releasedDogs(db)).has(record.dog_id))return null;
 const a=await db.from('go_official_assets').select('title,display_path')
  .eq('version_id',set.data.current_version).eq('slot',record.slot).maybeSingle();
 if(a.error)throw a.error;if(!a.data)return null;
 const signed=await db.storage.from('go-official-cards').createSignedUrl(a.data.display_path,900);
 if(signed.error)throw signed.error;
 return {id:record.dog_id,kind:'official',officialSlot:record.slot,slot:record.slot,
  ownerId:record.member_id,dogId:record.dog_id,dogName:dog.data.name,
  title:a.data.title,nickname:'멍기록가',status:'approved',
  capturedAt:record.acquired_at||record.unlocked_at,
  imageUrl:signed.data?.signedUrl||'',
  battle:{power:record.power,charm:record.charm,element:gameElement(dog.data.name)}};
}
export async function listOfficialBattleCards(db,member,query='',order='newest',page=0,limit=4){
 const [regular,hidden]=await Promise.all([
  db.from('go_official_owned').select('dog_id,slot,power,charm,acquired_at').eq('member_id',member.id),
  db.from('go_official_hidden').select('dog_id,power,charm,unlocked_at').eq('member_id',member.id)
 ]);
 if(regular.error||hidden.error)throw Error('official owned lookup');
 const released=await releasedDogs(db);
 const rows=[...(regular.data||[]),...(hidden.data||[]).map(x=>({...x,slot:5,acquired_at:x.unlocked_at}))]
  .filter(c=>SCORE_VALID(c.power)&&SCORE_VALID(c.charm)&&released.has(c.dog_id));
 const dogIds=[...new Set(rows.map(x=>x.dog_id))];
 if(!dogIds.length)return {cards:[],total:0,hasMore:false};
 const [dogs,sets]=await Promise.all([
  db.from('dogs').select('id,name').in('id',dogIds),
  db.from('go_official_sets').select('dog_id,current_version').in('dog_id',dogIds)
 ]);
 if(dogs.error||sets.error)throw Error('official catalog lookup');
 const dogMap=new Map((dogs.data||[]).map(x=>[x.id,x.name]));
 const versionMap=new Map((sets.data||[]).map(x=>[x.dog_id,x.current_version]));
 const versionIds=[...new Set([...versionMap.values()].filter(Boolean))];
 const assets=versionIds.length?await db.from('go_official_assets').select('version_id,slot,title,display_path').in('version_id',versionIds):{data:[],error:null};
 if(assets.error)throw assets.error;
 const assetMap=new Map((assets.data||[]).map(x=>[`${x.version_id}:${x.slot}`,x]));
 const searched=String(query).toLocaleLowerCase('ko');
 const visible=rows.map(x=>({...x,dogName:dogMap.get(x.dog_id),asset:assetMap.get(`${versionMap.get(x.dog_id)}:${x.slot}`)}))
  .filter(x=>x.dogName&&x.asset).filter(x=>!searched||x.dogName.toLocaleLowerCase('ko').includes(searched)||x.asset.title?.toLocaleLowerCase('ko').includes(searched))
  .sort((a,b)=>(order==='oldest'?1:-1)*String(a.acquired_at||'').localeCompare(String(b.acquired_at||'')));
 const chosen=visible.slice(page*limit,(page+1)*limit);
 const signed=chosen.length?await db.storage.from('go-official-cards').createSignedUrls(chosen.map(x=>x.asset.display_path),900):{data:[],error:null};
 if(signed.error)throw signed.error;
 return {cards:chosen.map((x,i)=>({id:x.dog_id,kind:'official',slot:x.slot,officialSlot:x.slot,ownerId:member.id,
  dogId:x.dog_id,dogName:x.dogName,title:x.asset.title,nickname:member.nickname||'멍기록가',status:'approved',
  capturedAt:x.acquired_at,imageUrl:signed.data?.[i]?.signedUrl||'',
  battle:{power:x.power,charm:x.charm,element:gameElement(x.dogName)}})),total:visible.length,hasMore:(page+1)*limit<visible.length};
}
