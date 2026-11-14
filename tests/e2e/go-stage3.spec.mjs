import {test,expect} from '@playwright/test';

const HOST='77777777-7777-4777-8777-777777777777';
const GUEST='66666666-6666-4666-8666-666666666666';
const ROOM='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const HOST_CARD='11111111-2222-4333-8444-555555555555';
const GUEST_CARD='99999999-8888-4777-8666-555555555555';
const DOG_A='22222222-2222-4222-8222-222222222222';
const DOG_B='99999999-9999-4999-8999-999999999999';
const member=(id)=>({id,nickname:id===HOST?'호스트':'게스트'});
const card=id=>id===HOST?{kind:'camera',cardId:HOST_CARD,slot:null,dogId:DOG_A,
 dogName:'깡지',title:'친구 대전',power:5,charm:4,imageUrl:'/figma-v3/collar.png'}:
 {kind:'camera',cardId:GUEST_CARD,slot:null,dogId:DOG_B,
 dogName:'버디',title:'카드 대결',power:2,charm:3,imageUrl:'/figma-v3/collar.png'};
const json=(route,data,status=200)=>route.fulfill({
 status,contentType:'application/json',body:JSON.stringify(data)
});
function roomModel(){
 let status='waiting',round=1,guestId=null,hostSelected=null,guestSelected=null;
 let hostReady=false,guestReady=false,hostRematch=false,guestRematch=false;
 let winner=null,hostScore=null,guestScore=null;let completed=0;
 const snap=id=>{
  const isHost=id===HOST;
  return {ok:true,roomId:ROOM,inviteCode:status==='waiting'?'A1B2C3D4E5F6':null,
   status,round,role:isHost?'host':'guest',hostName:'호스트',guestName:guestId?'게스트':'참가 대기',
   joined:Boolean(guestId),inviteExpiresAt:new Date(Date.now()+1800000).toISOString(),
   readyDeadline:status==='playing'?new Date(Date.now()+120000).toISOString():null,
   myReady:isHost?hostReady:guestReady,otherReady:isHost?guestReady:hostReady,
   mySelected:Boolean(isHost?hostSelected:guestSelected),
   otherSelected:Boolean(isHost?guestSelected:hostSelected),
   myCard:isHost?hostSelected:guestSelected,
   otherCard:status==='completed'?(isHost?guestSelected:hostSelected):null,
   hostScore,guestScore,winner,myRematch:isHost?hostRematch:guestRematch,
   otherRematch:isHost?guestRematch:hostRematch,
   myStats:completed?isHost?{wins:1,draws:0,losses:0}:{wins:0,draws:0,losses:1}:
    {wins:0,draws:0,losses:0},
   otherStats:completed?isHost?{wins:0,draws:0,losses:1}:{wins:1,draws:0,losses:0}:
    {wins:0,draws:0,losses:0},
   recent:[]};
 };
 function action(id,b){
  if(b.action==='create'){status='waiting';return snap(HOST);}
  if(b.action==='join'){
   if(id===GUEST&&b.invite===ROOM){guestId=GUEST;status='playing';}
   return snap(id);
  }
  if(b.action==='leave'){status='cancelled';return {ok:true,status:'cancelled'};}
  if(b.action==='sync')return snap(id);
  if(status==='playing'){
   if(b.action==='select'){
    if(id===HOST)hostSelected=card(HOST);
    else guestSelected=card(GUEST);
   }
   if(b.action==='ready'){
    if(id===HOST)hostReady=true;else guestReady=true;
    if(hostReady&&guestReady){
     status='completed';winner='host';hostScore=9;guestScore=5;completed++;
    }
   }
   if(b.action==='unready'){if(id===HOST)hostReady=false;else guestReady=false;}
  }else if(status==='completed'&&b.action==='rematch'){
   if(id===HOST)hostRematch=true;else guestRematch=true;
   if(hostRematch&&guestRematch){
    status='playing';round++;hostSelected=null;guestSelected=null;
    hostReady=false;guestReady=false;hostRematch=false;guestRematch=false;
    winner=null;hostScore=null;guestScore=null;
   }
  }
  return snap(id);
 }
 return {snap,action,stats:()=>({round,status,completed})};
}
async function player(browser,identity,model){
 const context=await browser.newContext({viewport:{width:390,height:844},baseURL:'http://127.0.0.1:3111'});
 await context.route('**/api/go/session',r=>json(r,{member:member(identity)}));
 await context.route('**/api/go/coins**',r=>json(r,{
  balance:110,today:'2026-11-14',
  daily:{careRewards:0,careQuestDone:false,visitQuestDone:false,drawQuestDone:false,battleQuestDone:false}
 }));
 await context.route('**/api/go/pvp**',r=>{
  const url=new URL(r.request().url());
  if(r.request().method()==='GET'){
   if(url.searchParams.get('mode')==='history')return json(r,{
    stats:{wins:0,draws:0,losses:0},recent:[]});
   return json(r,{kind:url.searchParams.get('kind')||'camera',
    cards:url.searchParams.get('kind')==='official'?[]:[card(identity)],total:1,hasMore:false});
  }
  const body=JSON.parse(r.request().postData()||'{}');
  return json(r,model.action(identity,body));
 });
 const page=await context.newPage();
 return {context,page};
}
test('two actual browser contexts join, hide rival card until both ready, then reveal server outcome',async({browser})=>{
 const model=roomModel();
 const a=await player(browser,HOST,model);
 const b=await player(browser,GUEST,model);
 try{
  console.log('PVP_E2E_STEP 99: await a.page.goto(/go/battle);');
  await a.page.goto('/go/battle');
  console.log('PVP_E2E_STEP 100: await a.page.getByRole(button,{name:친구 초대방 만들기}).click();');
  await a.page.getByRole('button',{name:'친구 초대방 만들기'}).click({timeout:12000});
  console.log('PVP_E2E_STEP 101: await expect(a.page.getByText(A1B2C3D4E5F6)).toBeVisible();');
  await expect(a.page.getByText('A1B2C3D4E5F6')).toBeVisible();
  console.log('PVP_E2E_STEP 102: await b.page.goto(/go/battle?room=+ROOM);');
  await b.page.goto('/go/battle?room='+ROOM);
  console.log('PVP_E2E_STEP 103: await expect(b.page.getByText(멍카드 출전 준비)).toBeVisible();');
  await expect(b.page.getByText('멍카드 출전 준비')).toBeVisible();
  console.log('PVP_E2E_STEP 104: await expect(a.page.getByText(게스트,{exact:true}).first()).toBeVisible({tim');
  await expect(a.page.getByText('게스트',{exact:true}).first()).toBeVisible({timeout:10000});
  console.log('PVP_E2E_STEP 105: await a.page.locator(.friend-pvp-card).first().click();');
  await a.page.locator('.friend-pvp-card').first().click({timeout:12000});
  console.log('PVP_E2E_STEP 106: await a.page.getByRole(button,{name:준비 완료 · 상대와 동시 공개}).click();');
  await a.page.getByRole('button',{name:'준비 완료 · 상대와 동시 공개'}).click({timeout:12000});
  console.log('PVP_E2E_STEP 107: await expect(b.page.getByText(✓ 준비 완료).first()).toBeVisible({timeout:1000');
  await expect(b.page.getByText('✓ 준비 완료').first()).toBeVisible({timeout:10000});
  console.log('PVP_E2E_STEP 108: await expect(b.page.locator(.friend-pvp-result-cards)).toHaveCount(0);');
  await expect(b.page.locator('.friend-pvp-result-cards')).toHaveCount(0);
  console.log('PVP_E2E_STEP 109: await b.page.locator(.friend-pvp-card).first().click();');
  await b.page.locator('.friend-pvp-card').first().click({timeout:12000});
  console.log('PVP_E2E_STEP 110: await b.page.getByRole(button,{name:준비 완료 · 상대와 동시 공개}).click();');
  await b.page.getByRole('button',{name:'준비 완료 · 상대와 동시 공개'}).click({timeout:12000});
  console.log('PVP_E2E_STEP 111: await expect(b.page.getByText(아쉽게 패배!)).toBeVisible({timeout:15000});');
  await expect(b.page.getByText('아쉽게 패배!')).toBeVisible({timeout:15000});
  console.log('PVP_E2E_STEP 112: await expect(a.page.getByText(승리!)).toBeVisible({timeout:15000});');
  await expect(a.page.getByText('승리!')).toBeVisible({timeout:15000});
  console.log('PVP_E2E_STEP 113: await expect(a.page.getByText(호스트 9 : 5 게스트)).toBeVisible();');
  await expect(a.page.getByText('호스트 9 : 5 게스트')).toBeVisible();
  console.log('PVP_E2E_STEP 114: await expect(b.page.getByText(호스트 9 : 5 게스트)).toBeVisible();');
  await expect(b.page.getByText('호스트 9 : 5 게스트')).toBeVisible();
  expect(model.stats().completed).toBe(1);
  console.log('PVP_E2E_STEP 116: await a.page.getByRole(button,{name:같은 친구와 재대결 신청}).click();');
  await a.page.getByRole('button',{name:'같은 친구와 재대결 신청'}).click({timeout:12000});
  console.log('PVP_E2E_STEP 117: await expect(b.page.getByText(친구가 재대결을 신청했어요.)).toBeVisible({timeout:1000');
  await expect(b.page.getByText('친구가 재대결을 신청했어요.')).toBeVisible({timeout:10000});
  console.log('PVP_E2E_STEP 118: await b.page.getByRole(button,{name:같은 친구와 재대결 신청}).click();');
  await b.page.getByRole('button',{name:'같은 친구와 재대결 신청'}).click({timeout:12000});
  console.log('PVP_E2E_STEP 119: await expect(a.page.getByText(친구 대전 · 2라운드)).toBeVisible({timeout:10000})');
  await expect(a.page.getByText('친구 대전 · 2라운드')).toBeVisible({timeout:10000});
  console.log('PVP_E2E_STEP 120: await expect(b.page.getByText(친구 대전 · 2라운드)).toBeVisible({timeout:10000})');
  await expect(b.page.getByText('친구 대전 · 2라운드')).toBeVisible({timeout:10000});
  console.log('PVP_E2E_STEP 121: await expect(a.page.locator(.friend-pvp-current)).toHaveCount(0);');
  await expect(a.page.locator('.friend-pvp-current')).toHaveCount(0);
 }finally{await Promise.allSettled([a.context.close(),b.context.close()]);}
});
test('anonymous guest is required to sign in before joining a room',async({page})=>{
 await page.route('**/api/go/session',r=>json(r,{member:null}));
 await page.goto('/go/battle?room='+ROOM);
 await expect(page.getByRole('button',{name:'로그인하고 시작하기'})).toBeVisible();
 await expect(page.locator('.friend-pvp-participants')).toHaveCount(0);
});
test('cancelled room offers safe restart and does not display a result',async({browser})=>{
 const model=roomModel();const a=await player(browser,HOST,model);
 try{
  await a.page.goto('/go/battle');
  await a.page.getByRole('button',{name:'친구 초대방 만들기'}).click();
  await a.page.route('**/api/go/pvp',async route=>{
   const payload=JSON.parse(route.request().postData()||'{}');
   if(payload.action==='sync')return json(route,{...model.snap(HOST),status:'cancelled'});
   return route.fallback();
  });
  await expect(a.page.getByRole('button',{name:'새 배틀 시작'})).toBeVisible({timeout:10000});
  await expect(a.page.getByText('승리!')).toHaveCount(0);
 }finally{await a.context.close();}
});
