import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {combinedAlbumRank,albumRankLabel} from '../lib/goAlbumSelection.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('rank includes approved personal + official + HIDDEN and uses tie-aware percentile',()=>{
 const members=Array.from({length:10},(_,i)=>({id:'m'+(i+1)}));
 const personal=[{member_id:'m2'},{member_id:'disabled'}];
 const official=members.map(m=>({member_id:m.id}));
 const hidden=[{member_id:'m1'}];
 const m1=combinedAlbumRank('m1',members,personal,official,hidden);
 assert.deepEqual(m1,{collected:2,participants:10,rank:1,ties:2,percentile:20});
 assert.equal(albumRankLabel(m1),'상위 20%');
 const m3=combinedAlbumRank('m3',members,personal,official,hidden);
 assert.deepEqual(m3,{collected:1,participants:10,rank:3,ties:8,percentile:100});
 const small=combinedAlbumRank('m1',members.slice(0,9),personal,official,hidden);
 assert.equal(small.percentile,null);
 assert.equal(albumRankLabel(small),'공동 1위 · 참여자 9명');
 assert.equal(combinedAlbumRank('disabled',members,personal,official,hidden).rank,null);
 const server=read('lib/server/goCollection.js');
 assert.match(server,/\.eq\('status','approved'\)/);
 for(const table of ['go_cards','go_official_owned','go_official_hidden','go_members'])
  assert.ok(server.includes(table),table);
});

test('free and paid draws share Figma static dialogue without escape action',()=>{
 const dialogue=read('components/GoCollarDialogue.js');
 const free=read('components/GoFreeDraw.js'),store=read('components/GoStore.js');
 assert.match(dialogue,/세 개 중 하나를 고른다/);
 assert.match(dialogue,/discovery-select-arrow/);
 assert.doesNotMatch(dialogue,/onClick=|<button/);
 assert.match(free,/GoCollarDialogue/);assert.match(store,/GoCollarDialogue/);
 assert.doesNotMatch(free,/도망간다/);assert.doesNotMatch(store,/도망간다/);
});

test('1:1 yellow inner-card selection is reused in solo battle and album management',()=>{
 for(const path of ['components/GoBattle.js','components/GoStage2OfficialCards.js','components/GoCard.js'])
  assert.match(read(path),/GoCardFace card=\{[^}]+\} selected=\{/);
 assert.doesNotMatch(read('components/GoBattle.js'),/meong-card-selected">✓/);
 const css=read('app/meonggo2-stage3-ui.css');
 assert.match(css,/\.meong-battle-card\.is-picked::after\{content:none/);
 assert.match(css,/\.s2-official-grid \.s2-official-card\[aria-pressed='true'\]/);
});

test('animation precedes server response and card reveal requires server result',()=>{
 const free=read('components/GoFreeDraw.js');
 const store=read('components/GoStore.js');
 const reveal=read('components/GoOfficialDrawReveal.js');
 assert.match(free,/setAnimationOpen\(true\)/);
 assert.match(store,/setRevealOpen\(true\)/);
 assert.match(reveal,/cardReady=introFinished&&Boolean\(card\?\.imageUrl\)/);
 assert.match(reveal,/const timeout=window\.setTimeout\(\(\)=>setIntroFinished\(true\),950\)/);
 assert.match(reveal,/멍카드 결과를 확인하고 있어요/);
 assert.match(store,/getKnownPending/);
 assert.match(store,/storePost\(details\)/);
 assert.match(store,/setPurchaseOutcome/);
});

test('store changes paid flow to price confirmation before dog and collar',()=>{
 const store=read('components/GoStore.js');
 assert.match(store,/setSelected\(\{mode:'random'\}\);setCollarChoice\(null\);setConfirm\(true\)/);
 assert.match(store,/setSelected\(\{mode:'specific'\}\);setPickerNotice\(''\);setConfirm\(true\)/);
 assert.match(store,/if\(selected\.mode==='specific'&&!dogId\)/);
 assert.match(store,/void buy\(dog\.dogId\)/);
 assert.match(store,/setChoiceOpen\(false\);setRevealOpen\(true\)/);
 assert.match(store,/purchaseFlowRef\.current=true/);
});

test('existing admin stats path now hosts five tabs; underlying record queries are read-only',()=>{
 const page=read('app/admin/go/stats/page.js');
 const dashboard=read('components/GoAdminDashboard.js');
 const api=read('app/api/admin/go/dashboard/route.js');
 assert.match(page,/GoAdminDashboard/);
 for(const value of ['overview','cards','coins','battle','community'])assert.ok(dashboard.includes(value),value);
 assert.match(dashboard,/GoAdminStats/);
 assert.match(api,/hasAdminSession\(request\)/);
 for(const table of ['go_draw_attempts','go_coin_transactions','go_official_purchases','go_battles','go_interactions','go_likes'])
  assert.ok(api.includes(table),table);
 assert.doesNotMatch(api,/export async function (POST|PATCH|DELETE)/);
});
