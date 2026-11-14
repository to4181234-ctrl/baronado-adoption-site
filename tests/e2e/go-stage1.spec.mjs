import { test, expect } from '@playwright/test';
const MEMBER = { id: '11111111-1111-4111-8111-111111111111', nickname: '테스트멍기록가' };
const DAY = '2026-11-14';
const positive = { id:'a', amount:10, event_type:'quest_care', local_day:DAY,created_at:'2026-11-14T01:00:00Z' };
const spent = { id:'b', amount:-30, event_type:'visit_reversal', local_day:DAY,created_at:'2026-11-14T01:30:00Z' };
const json = (route, body, status=200) => route.fulfill({
  status, contentType:'application/json; charset=utf-8',
  headers:{'cache-control':'no-store'}, body:JSON.stringify(body)
});
async function mockGame(page, { careDone=true,visitDone=false,balance=50 }={}) {
  await page.route('**/api/go/session', route => json(route,{member:MEMBER}));
  await page.route('**/api/go/coins**', route => {
    const u = new URL(route.request().url());
    if (u.searchParams.get('history')==='1') {
      const filter = u.searchParams.get('filter') || 'all';
      const all = filter==='earn'?[positive]:filter==='spend'?[spent]:[spent,positive];
      return json(route, { balance,history:{records:all,hasMore:false,nextOffset:all.length,filter} });
    }
    return json(route,{
      balance, today: DAY,
      daily:{careRewards:3,careQuestDone:careDone,visitQuestDone:visitDone}
    });
  });
}

test('stage-one quests show only two, incomplete first and current coin balance', async ({page}) => {
  await mockGame(page);
  await page.goto('/go/quests');
  await expect(page.getByRole('heading',{name:'오늘의 퀘스트'})).toBeVisible();
  await expect(page.getByText('1 / 2')).toBeVisible();
  await expect(page.getByText('음료 구매 방문 인증')).toBeVisible();
  await expect(page.getByText('오늘 첫 돌보기')).toBeVisible();
  await expect(page.getByText('무료 뽑기')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/멍코인 50C/})).toBeVisible();
  const cards=page.locator('.go-quest-item');
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText('음료 구매 방문 인증');
});

test('coin history sheet filters earn/spend and allows expanding an entry', async ({page}) => {
  await mockGame(page);
  await page.goto('/go/quests');
  await page.getByRole('button',{name:/멍코인 50C/}).click();
  const dialog=page.getByRole('dialog',{name:'멍코인 이용 내역'});
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.go-coin-transaction')).toHaveCount(2);
  await dialog.getByRole('button',{name:'획득',exact:true}).click();
  await expect(dialog.locator('.go-coin-transaction')).toHaveCount(1);
  await expect(dialog.locator('.go-coin-transaction')).toContainText('+10C');
  await dialog.locator('.go-coin-transaction>button').click();
  await expect(dialog.getByText('내역 구분: 획득')).toBeVisible();
  await dialog.getByRole('button',{name:'사용',exact:true}).click();
  await expect(dialog.locator('.go-coin-transaction')).toContainText('-30C');
  await dialog.getByRole('button',{name:'이용 내역 닫기'}).click();
  await expect(dialog).not.toBeVisible();
});

test('visit request, countdown and cancellation are wired to stage-one API', async ({page}) => {
  await mockGame(page,{careDone:false});
  let current = null;
  await page.route('**/api/go/visit',route=>{
    if (route.request().method()==='POST') {
      const body=JSON.parse(route.request().postData());
      if (body.action==='request') {
        current={
          id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',code:'A1B2C3D4',
          status:'pending',expiresAt:new Date(Date.now()+29*60*1000).toISOString(),
          createdAt:new Date().toISOString()
        };
        return json(route,{ok:true,status:'pending',code:current.code});
      }
      if (body.action==='cancel') {
        current={...current,status:'cancelled'};
        return json(route,{ok:true,status:'cancelled'});
      }
    }
    return json(route,{request:current,canRequestNow:true,today:DAY});
  });
  await page.goto('/go/visit');
  await page.getByRole('button',{name:'인증코드 발급하기'}).click();
  await expect(page.getByText('A1B2C3D4')).toBeVisible();
  await expect(page.getByText(/남은 시간/)).toBeVisible();
  await page.getByRole('button',{name:'신청 취소'}).click();
  await expect(page.getByText('이전 신청을 취소했어요.')).toBeVisible();
});

test('admin queue renders pending code and sends approval only on click',async ({page})=>{
  await page.route('**/api/admin/session',route=>json(route,{configured:true,authenticated:true}));
  let status='pending';let writes=0;
  await page.route('**/api/admin/go/visit**',route=>{
    if (route.request().method()==='PATCH') {
      writes++;
      const body=JSON.parse(route.request().postData());
      if(body.action==='approve'){status='approved';return json(route,{ok:true,status:'approved',coinsAdded:30,balance:30});}
      return json(route,{error:'Unsupported'},400);
    }
    return json(route,{requests:[{
      id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',code:'A1B2C3D4',
      status, nickname:'현장방문자',created_at:new Date().toISOString(),
      expires_at:new Date(Date.now()+1800000).toISOString()
    }],total:1,hasMore:false});
  });
  page.on('dialog',dialog=>dialog.accept());
  await page.goto('/admin/go/visit');
  await expect(page.getByRole('heading',{name:'방문 인증 관리'})).toBeVisible();
  await page.getByRole('button',{name:/A1B2C3D4/}).click();
  await expect(page.getByRole('heading',{name:/인증 상세/})).toBeVisible();
  await expect.poll(()=>writes).toBe(0);
  await page.getByRole('button',{name:/현장 확인 후 30C 지급/}).click();
  await expect.poll(()=>writes).toBe(1);
  await expect(page.getByText('승인하고 30C를 지급했어요.')).toBeVisible();
});
