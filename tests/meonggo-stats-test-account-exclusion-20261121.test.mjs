import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TEST_ACCOUNT_IDS,excludeTestAccounts,excludeStatsAccounts,getExcludedStatsAccountIds,isTestAccount,isRealMatch} from '../lib/server/goStatsExcludedAccounts.js';

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
 assert.match(api,/if\(MEMBER_COLUMNS\[table\]\)q=excludeStatsAccounts\(q,MEMBER_COLUMNS\[table\],excludedMemberIds\)/);
 assert.match(api,/opponent_id\.is\.null,opponent_id\.not\.in/);
 assert.match(api,/realLikes=likes\.filter\(l=>eligiblePostIds\.has\(l\.card_id\)\)/);
 assert.match(api,/value:realLikes\.length/);
 for(const tab of ['overview','cards','coins','battle','community'])assert.ok(api.includes(`tab==='${tab}'`)||api.includes(`tab==='overview'`),tab);
 assert.doesNotMatch(api,/export async function (POST|PATCH|DELETE)/);
});

test('legacy community stats exclude test-created posts and likes by test accounts without altering the DB',()=>{
 const api=read('app/api/admin/go/stats/route.js');
 assert.match(api,/excludeStatsAccounts\(db\.from\('go_card_index'\)/);
 assert.match(api,/excludeStatsAccounts\(db\.from\('go_likes'\)/);
 assert.match(api,/if\(!postIds\.has\(like\.card_id\)\)continue/);
 assert.match(api,/const totals=\{posts:posts\.length,published:0,pending:0,rejected:0,likes:0\}/);
 assert.match(api,/topPosts:top\.slice\(0,10\)/);
 assert.doesNotMatch(api,/export async function (POST|PATCH|DELETE)/);
});

test('all-time manual admin grants automatically exclude new members, even after nicknames change',async()=>{
 const granted=[
  {member_id:'d38e0c85-63b7-4809-a380-99e0b80aea88'}, // 왕엉
  {member_id:'f1dfd873-3846-42de-bc91-e4df3e9e2eba'}, // future person with admin_grant
  {member_id:'f1dfd873-3846-42de-bc91-e4df3e9e2eba'}
 ];
 const calls=[];
 const db={from(table){
  assert.equal(table,'go_coin_transactions');
  return {select(field){assert.equal(field,'member_id');return this;},
   eq(field,value){calls.push([field,value]);return this;},
   order(){return this;},
   range(from,to){return Promise.resolve({data:granted.slice(from,to+1),error:null});}};
 }};
 const excluded=await getExcludedStatsAccountIds(db);
 assert.equal(calls[0][0],'event_type');
 assert.equal(calls[0][1],'admin_grant');
 assert.equal(new Set(excluded).size,TEST_ACCOUNT_IDS.length+2);
 for(const id of TEST_ACCOUNT_IDS)assert.ok(excluded.includes(id));
 assert.ok(excluded.includes(granted[0].member_id));
 assert.ok(excluded.includes(granted[1].member_id));
 const qCalls=[];
 const query={not(...args){qCalls.push(args);return this;}};
 excludeStatsAccounts(query,'member_id',excluded);
 assert.deepEqual(qCalls,[['member_id','in',`(${excluded.join(',')})`]]);
});

test('manual-grant exclusions fail closed rather than silently counting grants after a query error',async()=>{
 const db={from(){return{
  select(){return this;},eq(){return this;},order(){return this;},
  range(){return Promise.resolve({data:null,error:{message:'network error'}});}
 };}};
 await assert.rejects(getExcludedStatsAccountIds(db));
});

test('all MeongGO admin stats routes obtain dynamic exclusions on each GET',()=>{
 for(const path of ['app/api/admin/go/dashboard/route.js','app/api/admin/go/stats/route.js']){
  const api=read(path);
  assert.match(api,/await getExcludedStatsAccountIds\(db\)/);
  assert.match(api,/excludedMemberIds/);
 }
 const dashboard=read('app/api/admin/go/dashboard/route.js');
 assert.match(dashboard,/opponent_id\.is\.null,opponent_id\.not\.in\.\(\$\{excludedMemberIds\.join/);
 assert.match(dashboard,/excludedTestAccounts:excludedMemberIds\.length/);
});
