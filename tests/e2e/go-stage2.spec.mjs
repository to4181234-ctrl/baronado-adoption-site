import {test,expect} from '@playwright/test';
const DOG='22222222-2222-4222-8222-222222222222';
const MEMBER={id:'11111111-1111-4111-8111-111111111111',nickname:'멍기록가'};
const json=(route,data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
const fullSlots=count=>Array.from({length:5},(_,i)=>{
 const n=i+1,owned=n<=count;
 return {slot:n,owned,title:owned?'사진 '+n:'',power:owned?3:null,charm:owned?4:null,
 imageUrl:owned?'/figma-v3/collar.png':'',acquiredAt:owned?'2026-11-14T00:00:00Z':null,
 new:owned&&n===count};
});
const officialDog=(count=0,hidden=false)=>({
 dogId:DOG,name:'깡지',adopted:false,paused:false,available:true,collected:count,missing:5-count,
 slots:fullSlots(count),hidden:{unlocked:hidden,new:hidden,imageUrl:hidden?'/figma-v3/collar.png':''}
});
async function stub(page,data={}){
 await page.route('**/api/go/session',r=>json(r,{member:MEMBER}));
 await page.route('**/api/go/coins**',r=>json(r,{
  balance:250,today:'2026-11-14',
  daily:{careRewards:0,careQuestDone:false,visitQuestDone:false,drawQuestDone:false}
 }));
 await page.route('**/api/go/official',r=>{
  if(r.request().method()==='POST')return json(r,{ok:true,coinsAdded:10,dogId:DOG,slot:1,duplicate:false,requiresChoice:false});
  return json(r,{day:'2026-11-14',drawUsed:false,pendingDuplicate:null,
    dogs:[officialDog(data.collected??0,data.hidden??false)]});
 });
}
test('official album is separate from original camera cards and locks unseen photos',async({page})=>{
 await stub(page);
 await page.goto('/go');
 await expect(page.getByRole('button',{name:'유기견 도감'})).toBeVisible();
 await expect(page.getByRole('button',{name:'나만의 카드'})).toBeVisible();
 await expect(page.locator('.go-official-locked')).toHaveCount(6);
 await expect(page.getByRole('button',{name:'무료 뽑기'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'오늘의 퀘스트'})).toBeVisible();
 await expect(page.locator('.go-quest-item')).toHaveCount(3);
 await page.getByRole('button',{name:'나만의 카드'}).click();
 await expect(page.getByRole('button',{name:'나만의 카드'})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.go-official-locked')).toHaveCount(0);
});
test('first daily official draw grants an unseen photo with quest reward',async({page})=>{
 let current=0,drawn=false;
 await stub(page);
 await page.unroute('**/api/go/official');
 await page.route('**/api/go/official',r=>{
  if(r.request().method()==='POST'){current=1;drawn=true;return json(r,{
   ok:true,coinsAdded:10,dogId:DOG,slot:1,duplicate:false,requiresChoice:false});}
  return json(r,{day:'2026-11-14',drawUsed:drawn,pendingDuplicate:null,
   dogs:[officialDog(current)]});
 });
 await page.goto('/go');
 await page.getByRole('button',{name:'무료 뽑기'}).click();
 await expect(page.getByRole('dialog',{name:'무료 뽑기 결과'})).toBeVisible();
 await expect(page.locator('.go-official-locked')).toHaveCount(5);
 await page.getByRole('dialog',{name:'무료 뽑기 결과'}).getByRole('button',{name:'확인'}).click();
 await expect(page.getByRole('button',{name:'오늘 뽑기 완료'})).toBeDisabled();
});
test('200C store purchase keeps a single request and shows confirmation',async({page})=>{
 let buys=0,body=null;
 await stub(page);
 await page.route('**/api/go/official/shop',r=>{
  buys++;body=JSON.parse(r.request().postData());
  return json(r,{ok:true,dogId:DOG,slot:2,coinsSpent:200,hiddenUnlocked:false});
 });
 page.on('dialog',d=>d.accept());
 await page.goto('/go');
 await page.getByRole('button',{name:'200C로 구매하기'}).click();
 await expect(page.getByRole('dialog',{name:'멍카드 구매 결과'})).toBeVisible();
 expect(buys).toBe(1);
 expect(body.dogId).toBe(DOG);
 expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
});
test('HIDDEN unlocked illustration has an owner-only PNG download',async({page})=>{
 await stub(page,{collected:5,hidden:true});
 await page.goto('/go');
 await page.getByRole('button',{name:/HIDDEN/}).first().click();
 await expect(page.getByRole('dialog',{name:'공식 멍카드 크게 보기'})).toBeVisible();
 await expect(page.getByRole('link',{name:'PNG 이미지 저장'}))
  .toHaveAttribute('href','/api/go/official/hidden?dogId='+DOG);
});
test('administrator publishes only after previewing all six uploaded assets',async({page})=>{
 await page.route('**/api/admin/session',r=>json(r,{configured:true,authenticated:true}));
 let set={dogId:DOG,currentVersion:null,paused:false,versions:[]};
 let count=0;
 await page.route('**/api/admin/go/official',r=>{
  const method=r.request().method();
  if(method==='GET')return json(r,{dogs:[{id:DOG,name:'깡지',adopted:false}],sets:set.versions.length?[set]:[]});
  if(method==='POST'){
   const body=JSON.parse(r.request().postData());
   if(body.action==='newDraft'){
    set={...set,versions:[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',status:'draft',assets:[]}]};
    return json(r,{ok:true,versionId:set.versions[0].id});
   }
   if(body.action==='publish'){
    expect(count).toBe(6);set.currentVersion=set.versions[0].id;
    set.versions[0].status='published';return json(r,{ok:true,status:'published'});
   }
  }
  return json(r,{error:'no action'},400);
 });
 await page.goto('/admin/go/official');
 await page.getByRole('button',{name:'공식 멍카드 등록 시작'}).click();
 const publish=page.getByRole('button',{name:'6종 일괄 공개하기'});
 await expect(publish).toBeDisabled();
});


test('lost purchase response survives reload and reconciles without another charge',async({page})=>{
 let purchases=0;
 await stub(page);
 await page.route('**/api/go/official/shop**',route=>{
  const u=new URL(route.request().url());
  if(route.request().method()==='GET'){
   expect(u.searchParams.get('requestId')).toMatch(/^[0-9a-f-]{36}$/);
   return json(route,{ok:true,found:true,dogId:DOG,slot:4,createdAt:'2026-11-14T00:00:00Z'});
  }
  purchases++;
  return route.abort('failed');
 });
 page.on('dialog',d=>d.accept());
 await page.goto('/go');
 await page.getByRole('button',{name:'200C로 구매하기'}).click();
 await expect(page.getByRole('button',{name:'이전 구매 결과 확인'})).toBeVisible();
 expect(purchases).toBe(1);
 await page.reload();
 await expect(page.getByRole('button',{name:'이전 구매 결과 확인'})).toBeVisible();
 await page.getByRole('button',{name:'이전 구매 결과 확인'}).click();
 await expect(page.getByRole('dialog',{name:'멍카드 구매 결과'})).toBeVisible();
 expect(purchases).toBe(1);
 await expect(page.getByRole('button',{name:'이전 구매 결과 확인'})).toHaveCount(0);
});
