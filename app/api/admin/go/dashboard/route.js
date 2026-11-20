import {hasAdminSession} from '../../../../../lib/server/adminSession.js';
import {adminDatabase} from '../../../../../lib/server/adminData.js';

export const dynamic='force-dynamic';
export const runtime='nodejs';

const TABS=new Set(['overview','cards','coins','battle','community']);
const PERIODS=new Set(['today','7d','30d','all']);
const DAY=86400000;
const kst=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'});
const dayOf=value=>kst.format(new Date(value));
const number=value=>Number(value)||0;
const unique=items=>new Set(items).size;
function addBy(items,key,value=()=>1){
 const grouped=new Map();
 for(const item of items)grouped.set(key(item),(grouped.get(key(item))||0)+value(item));
 return [...grouped.entries()].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'ko'));
}
function sums(items,fn){return items.reduce((total,row)=>total+number(fn(row)),0);}
function chartFrom(items,period,timestamp,metric=()=>1){
 const grouped=new Map();
 for(const item of items){
  const stamp=item[timestamp];if(!stamp)continue;
  const date=timestamp==='local_day'?String(stamp).slice(0,10):dayOf(stamp);
  const key=period==='all'?date.slice(0,7):date;
  grouped.set(key,(grouped.get(key)||0)+metric(item));
 }
 return [...grouped.entries()].sort(([a],[b])=>a.localeCompare(b))
  .slice(period==='all'?-12:period==='30d'?-30:period==='7d'?-7:-1)
  .map(([day,count])=>({day,count:Math.max(0,count)}));
}
async function allRows(query){
 const size=1000,result=[];
 for(let offset=0;offset<50000;offset+=size){
  const {data,error}=await query(offset,size);
  if(error)throw error;
  result.push(...(data||[]));
  if((data||[]).length<size)return result;
 }
 throw Error('통계가 조회 가능 범위를 초과했어요.');
}
export async function GET(request){
 if(!await hasAdminSession(request))return Response.json({error:'관리자 로그인이 필요해요.'},{status:401});
 const params=new URL(request.url).searchParams;
 const tab=params.get('tab')||'overview',period=params.get('period')||'7d';
 if(!TABS.has(tab)||!PERIODS.has(period))return Response.json({error:'통계 종류 또는 기간을 확인해주세요.'},{status:400});
 const today=dayOf(Date.now());
 const midnight=Date.parse(today+'T00:00:00+09:00');
 const start=period==='all'?null:new Date(midnight-(period==='today'?0:period==='7d'?6:29)*DAY).toISOString();
 const end=new Date(midnight+DAY).toISOString();
 const startDay=start?dayOf(start):null;
 const db=adminDatabase();
 const load=(table,cols,field='created_at')=>allRows((offset,size)=>{
  let q=db.from(table).select(cols);
  if(start&&field){q=q.gte(field,field==='local_day'?startDay:start).lt(field,field==='local_day'?dayOf(end):end);}
  return q.range(offset,offset+size-1);
 });
 const current=(table,cols)=>load(table,cols,null);
 try{
  let cards=[],chart={title:'',rows:[]},rows=[],note='';
  if(tab==='overview'){
   const [members,personal,official,hidden,coins,solo,pvp]=await Promise.all([
    current('go_members','id,disabled,created_at'),
    load('go_cards','id,status,created_at'),
    load('go_official_owned','member_id,dog_id,slot,acquired_at','acquired_at'),
    load('go_official_hidden','member_id,dog_id,unlocked_at','unlocked_at'),
    load('go_coin_transactions','amount,created_at'),
    load('go_battles','id,created_at'),
    load('go_pvp_records','room_id,round_number,finished_at','finished_at')
   ]);
   const approved=personal.filter(p=>p.status==='approved');
   const pvpRounds=unique(pvp.map(p=>p.room_id+':'+p.round_number));
   cards=[
    {label:'전체 활성 계정',value:members.filter(m=>!m.disabled).length,unit:'명',detail:'로그인 DAU가 아닌 이용 가능 계정 수'},
    {label:'기간 중 신규 가입',value:members.filter(m=>!m.disabled&&(!start||m.created_at>=start)&&m.created_at<end).length,unit:'명'},
    {label:'기간 중 신규 수집',value:approved.length+official.length+hidden.length,unit:'장',detail:'승인된 개인·공식·HIDDEN 카드'},
    {label:'기간 중 멍코인 소비',value:-sums(coins.filter(c=>c.amount<0),c=>c.amount),unit:'C'},
    {label:'기간 중 멍배틀',value:solo.length+pvpRounds,unit:'회',detail:'랜덤 배틀 + 중복 제거한 1:1 라운드'}
   ];
   chart={title:'승인된 나만의 카드 등록 추이',rows:chartFrom(approved,period,'created_at')};
   rows=[{label:'나만의 카드 승인',count:approved.length},{label:'공식 카드 신규 보유',count:official.length},
    {label:'HIDDEN 해금',count:hidden.length},{label:'랜덤 멍배틀',count:solo.length},{label:'1:1 대결 라운드',count:pvpRounds}];
   note='활성 계정은 계정 정지 여부를 기준으로 집계합니다. 실제 일간 접속자(DAU)를 뜻하지 않습니다.';
  }else if(tab==='cards'){
   const [attempts,legacy,purchases,owned,hidden,personal,dogs]=await Promise.all([
    load('go_draw_attempts','member_id,dog_id,source_type,local_day,duplicate','local_day'),
    load('go_official_daily_draws','member_id,dog_id,local_day,duplicate','local_day'),
    load('go_official_purchases','dog_id,purchase_mode,coins,created_at'),
    load('go_official_owned','dog_id,slot,acquired_at','acquired_at'),
    load('go_official_hidden','dog_id,unlocked_at','unlocked_at'),
    load('go_cards','dog_id,status,created_at'),
    current('dogs','id,name,category,adopted')
   ]);
   const free=attempts.filter(a=>a.source_type==='free');
   const draws=[...free,...legacy];
   const duplicate=attempts.filter(a=>a.duplicate);
   const totalAttempt=attempts.length+legacy.length;
   const dayGroups=addBy(draws,a=>a.member_id+':'+a.local_day);
   const names=new Map(dogs.filter(d=>d.category==='adoption').map(d=>[d.id,d.name]));
   cards=[
    {label:'무료 뽑기 사용',value:draws.length,unit:'회'},
    {label:'무료 뽑기 참여자',value:unique(draws.map(a=>a.member_id)),unit:'명'},
    {label:'하루 2회 사용 계정·날짜',value:dayGroups.filter(g=>g.count>=2).length,unit:'건'},
    {label:'스토어 구매',value:purchases.length,unit:'건'},
    {label:'중복 획득 비율',value:totalAttempt?Math.round(duplicate.length/totalAttempt*100):0,unit:'%',detail:'무료·스토어 추첨 기록 기준'},
    {label:'HIDDEN 해금',value:hidden.length,unit:'건'}
   ];
   chart={title:'무료 뽑기 사용 추이',rows:chartFrom(draws,period,'local_day')};
   rows=[
    {label:'일반 랜덤 구매 (60C)',count:purchases.filter(p=>p.purchase_mode==='random').length},
    {label:'지정 랜덤 구매 (100C)',count:purchases.filter(p=>p.purchase_mode==='specific').length},
    {label:'공식 카드 신규 획득',count:owned.length},
    {label:'승인된 나만의 카드',count:personal.filter(p=>p.status==='approved').length},
    ...addBy([...owned,...hidden],a=>names.get(a.dog_id)||'기타 강아지').slice(0,8).map(x=>({label:x.label+' · 공식/HIDDEN 획득',count:x.count}))
   ];
   note='무료 사용 횟수에는 이전 방식의 일일 뽑기 기록도 포함합니다. 카드의 중복률은 실제 추첨 기록으로 계산합니다.';
  }else if(tab==='coins'){
   const [transactions,wallets]=await Promise.all([
    load('go_coin_transactions','amount,event_type,local_day,created_at','local_day'),
    current('go_coin_wallets','balance')
   ]);
   const incomes=transactions.filter(t=>t.amount>0),spends=transactions.filter(t=>t.amount<0);
   const quest=transactions.filter(t=>String(t.event_type).startsWith('quest_'));
   cards=[
    {label:'멍코인 지급',value:sums(incomes,t=>t.amount),unit:'C'},
    {label:'멍코인 소비',value:-sums(spends,t=>t.amount),unit:'C'},
    {label:'퀘스트 보상 지급',value:quest.length,unit:'건',detail:'퀘스트 완료 클릭 수와는 다름'},
    {label:'관리자 수동 지급',value:sums(transactions.filter(t=>t.event_type==='admin_grant'),t=>t.amount),unit:'C'},
    {label:'현재 전체 잔액',value:sums(wallets,t=>t.balance),unit:'C',detail:'기간과 무관한 현재 잔액 합산'}
   ];
   chart={title:'멍코인 소비 추이',rows:chartFrom(spends,period,'local_day',t=>-number(t.amount))};
   rows=addBy(transactions,t=>t.event_type,t=>Math.abs(number(t.amount))).map(r=>({label:r.label,count:r.count})).slice(0,20);
   note='상세 내역은 멍코인 거래 기록 기준이며, 운영자 지급과 게임 보상을 구분합니다. 현재 잔액은 기간 필터에 영향받지 않습니다.';
  }else if(tab==='battle'){
   const [solo,pvp,care,affinity,visits,dogs]=await Promise.all([
    load('go_battles','member_id,first_dog_id,created_at'),
    load('go_pvp_records','member_id,room_id,round_number,finished_at','finished_at'),
    load('go_interactions','member_id,dog_id,action,created_at'),
    current('go_affinity','member_id,dog_id,level'),
    load('go_visit_requests','status,created_at'),
    current('dogs','id,name,category')
   ]);
   const pvpRounds=unique(pvp.map(r=>r.room_id+':'+r.round_number));
   const players=unique([...solo.map(x=>x.member_id),...pvp.map(x=>x.member_id)]);
   const names=new Map(dogs.filter(d=>d.category==='adoption').map(d=>[d.id,d.name]));
   cards=[
    {label:'랜덤 멍배틀',value:solo.length,unit:'회'},
    {label:'1:1 멍배틀',value:pvpRounds,unit:'라운드',detail:'두 참여자의 기록을 중복 제거'},
    {label:'멍배틀 참여 계정',value:players,unit:'명'},
    {label:'돌보기 상호작용',value:care.length,unit:'회'},
    {label:'방문 인증 승인',value:visits.filter(v=>v.status==='approved').length,unit:'건'},
    {label:'현재 호감도 기록',value:affinity.length,unit:'건',detail:'기간과 무관한 보유 기록'}
   ];
   chart={title:'강아지 돌보기 이용 추이',rows:chartFrom(care,period,'created_at')};
   rows=addBy(care,c=>names.get(c.dog_id)||'기타 강아지').slice(0,12);
   note='호감도 기록은 현재 상태이며 기간별 누적 변화를 뜻하지 않습니다. 1:1 배틀은 참가자별 기록을 경기별로 합쳤습니다.';
  }else{
   const [posts,likes,dogs]=await Promise.all([
    load('go_cards','id,dog_id,title,status,share_count,created_at'),
    load('go_likes','card_id,created_at'),
    current('dogs','id,name,category')
   ]);
   const names=new Map(dogs.map(d=>[d.id,d.name]));
   cards=[
    {label:'기간 내 등록 게시물',value:posts.length,unit:'건'},
    {label:'공개 게시물',value:posts.filter(p=>p.status==='approved').length,unit:'건'},
    {label:'숨김·반려 게시물',value:posts.filter(p=>p.status!=='approved').length,unit:'건'},
    {label:'기간 내 좋아요',value:likes.length,unit:'개'},
    {label:'기간 내 게시물의 누적 공유',value:sums(posts,p=>p.share_count),unit:'회',detail:'게시물 등록 이후 누적 수치'}
   ];
   chart={title:'게시물 등록 추이',rows:chartFrom(posts,period,'created_at')};
   rows=addBy(posts,p=>names.get(p.dog_id)||'기타 강아지').slice(0,12);
   note='기간별 게시물 수는 등록일 기준, 좋아요 수는 누른 시점 기준입니다. 공유 수치는 해당 기간에 등록된 게시물의 현재 누적 수치입니다.';
  }
  return Response.json({tab,period,today,cards,chart,rows,note},{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  console.error('MeongGO admin dashboard aggregate failed:',e?.code||e?.message||'unknown');
  return Response.json({error:'통계를 불러오지 못했어요.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
