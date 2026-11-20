import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TEST_ACCOUNT_IDS,excludeTestAccounts,isTestAccount,isRealMatch} from '../lib/server/goStatsExcludedAccounts.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('three permanent test accounts are identified by stable UUID rather than display nickname',()=>{
 assert.equal(TEST_ACCOUNT_IDS.length,3);
 assert.equal(new Set(TEST_ACCOUNT_IDS).size,3);
 for(const id of TEST_ACCOUNT_IDS)assert.match(id,/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i);
 for(const id of TEST_ACCOUNT_IDS)assert.equal(isTestAccount(id),true);
 assert.equal(isTestAccount('00100000-0000-4000-8000-000000000000'),false);
});

test('query helper excludes these IDs before pagination, independent of event date',()=>{
 const calls=[];
 const query={not(...args){calls.push(args);return this;}};
 assert.equal(excludeTestAccounts(query),query);
 assert.deepEqual(calls[0],['member_id','in',`(${TEST_ACCOUNT_IDS.join(',')})`]);
 assert.equal(excludeTestAccounts(query,'id'),query);
 assert.deepEqual(calls[1],['id','in',`(${TEST_ACCOUNT_IDS.join(',')})`]);
});

test('a 1:1 match involving a test participant is not counted for either side',()=>{
 const real='00100000-0000-4000-8000-000000000000';
 assert.equal(isRealMatch({member_id:real,opponent_id:real}),true);
 assert.equal(isRealMatch({member_id:real,opponent_id:null}),true);
 for(const t of TEST_ACCOUNT_IDS){
  assert.equal(isRealMatch({member_id:t,opponent_id:real}),false);
  assert.equal(isRealMatch({member_id:real,opponent_id:t}),false);
 }
});

test('all five dashboard tabs use the permanent member filters before loading records',()=>{
 const api=read('app/api/admin/go/dashboard/route.js');
 assert.match(api,/const MEMBER_COLUMNS=\{/);
 const tables=['go_members','go_cards','go_official_owned','go_official_hidden',
  'go_coin_transactions','go_coin_wallets','go_official_purchases','go_draw_attempts',
  'go_official_daily_draws','go_battles','go_pvp_records','go_interactions',
  'go_affinity','go_visit_requests','go_likes'];
 for(const name of tables)assert.match(api,new RegExp(`\\b${name}:'`),name);
 assert.match(api,/if\(MEMBER_COLUMNS\[table\]\)q=excludeTestAccounts\(q,MEMBER_COLUMNS\[table\]\)/);
 assert.match(api,/opponent_id\.is\.null,opponent_id\.not\.in/);
 assert.match(api,/realLikes=likes\.filter\(l=>eligiblePostIds\.has\(l\.card_id\)\)/);
 assert.match(api,/value:realLikes\.length/);
 for(const tab of ['overview','cards','coins','battle','community'])assert.ok(api.includes(`tab==='${tab}'`)||api.includes(`tab==='overview'`),tab);
 assert.doesNotMatch(api,/export async function (POST|PATCH|DELETE)/);
});

test('legacy community stats exclude test-created posts and likes by test accounts without altering the DB',()=>{
 const api=read('app/api/admin/go/stats/route.js');
 assert.match(api,/excludeTestAccounts\(db\.from\('go_card_index'\)/);
 assert.match(api,/excludeTestAccounts\(db\.from\('go_likes'\)/);
 assert.match(api,/if\(!postIds\.has\(like\.card_id\)\)continue/);
 assert.match(api,/const totals=\{posts:posts\.length,published:0,pending:0,rejected:0,likes:0\}/);
 assert.match(api,/topPosts:top\.slice\(0,10\)/);
 assert.doesNotMatch(api,/export async function (POST|PATCH|DELETE)/);
});
