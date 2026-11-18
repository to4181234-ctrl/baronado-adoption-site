import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const ui=read('components/GoRecorder.js'),api=read('app/api/go/recorders/[id]/route.js'),css=read('app/figma-stage11-public-profile.css');
test('approved A-D profile structures and previous-page controls',()=>{
 for(const word of ['s4-identity','s4-public-home','s4-dog-grid','s4-public-records','s4-dog-banner','s4-card-grid','s4-profile-return'])assert.ok(ui.includes(word),word);
 assert.match(ui,/공개 도감/);assert.match(ui,/나만의 카드/);assert.match(ui,/멍멍이별 대결 전적/);
 assert.match(ui,/current===0/);assert.match(ui,/current>=total-1/);
});
test('public-only API fields exclude wallet, private photos, settings and transactions',()=>{
 assert.match(api,/select\('id,nickname,profile_bio,avatar_dog'\)/);
 assert.match(api,/\.eq\('status','approved'\)/);
 assert.match(api,/\.eq\('member_id',id\)/);
 assert.match(api,/go_official_owned/);assert.match(api,/go_official_hidden/);
 assert.doesNotMatch(api,/go_coin_transactions|go_wallets|go_visit_requests|go_daily_quests/);
 assert.match(api,/Cache-Control':'private, no-store/);
});
test('public profile uses read-only card graphics without owner actions',()=>{
 assert.match(ui,/GoCardFace/);assert.match(ui,/LockedOfficialCard/);
 assert.doesNotMatch(ui,/<GoCamera|<GoCard\s|onDelete=|onSelect=|unlockHidden|setExporting|GoPostEditor/);
});
test('cumulative PvP counts are exact, not latest 20',()=>{
 assert.match(api,/loadBattleHistory\(db,id\)/);
 assert.match(read('lib/server/goBattleHistory.js'),/go_dog_battle_totals/);
 assert.match(read('docs/restoration/stage3-last-card-pvp-DRAFT.sql'),/UNION ALL/);
 assert.doesNotMatch(api,/\.limit\(20\)/);
 assert.match(api,/recordsAvailable=false/);
});
test('Figma assets and isolated responsive CSS exist',()=>{
 for(const name of ['album-panel-bg.svg','album-panel-outer.svg','album-panel-inner.svg'])assert.ok(existsSync(new URL('public/figma-v3/'+name,root)));
 for(const word of ['s4-public-profile','grid-template-columns:repeat(3,minmax(0,1fr))','grid-template-columns:repeat(2,minmax(0,1fr))','max-width:350px'])assert.ok(css.includes(word),word);
 assert.match(read('app/layout.js'),/figma-stage11-public-profile.css/);
});

test('public card graphic remains within its two-column cell',()=>{
 assert.match(css,/s4-public-card[^}]+position:relative;inset:auto/);
 assert.match(css,/gap:20px 26px/);
 assert.match(ui,/등록 순서 \| 최신순/);
});
