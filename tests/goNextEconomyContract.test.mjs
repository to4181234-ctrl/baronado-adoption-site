import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=read('docs/sql/MEONGGO_NEXT_ECONOMY_DRAFT.sql');

test('SQL draft is review-only, transactional, and preserves historical prices',()=>{
 assert.match(sql,/DO NOT APPLY TO PRODUCTION/);
 assert.match(sql,/^BEGIN;/m);
 assert.match(sql,/COMMIT;\s*$/);
 assert.doesNotMatch(sql,/\bTRUNCATE\b|\bDROP TABLE\b|\bDELETE FROM\b/i);
 assert.match(sql,/CHECK \(coins IN \(60,100,200,300\)\)/);
 assert.match(sql,/v_price:=CASE WHEN p_mode='random' THEN 60 ELSE 100 END/);
});

test('SQL creates independent idempotent attempts and resolves duplicates by attempt ID',()=>{
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.go_draw_attempts/);
 assert.match(sql,/UNIQUE\(member_id,source_type,request_id\)/);
 assert.match(sql,/go_draw_attempts_one_unresolved_per_member/);
 assert.match(sql,/go_official_draw_v2\(/);
 assert.match(sql,/go_official_resolve_duplicate_v2\(/);
 assert.match(sql,/go_store_purchase_v2\(/);
 assert.match(sql,/random\(\)<0\.6/g);
 assert.match(sql,/v_count>=2/);
 assert.match(sql,/source_type='free'/);
 assert.doesNotMatch(sql,/VALUES\(p_member,10,'quest_draw'/);
});

test('SQL prevents replaying +3C results and keeps 10C first-battle only',()=>{
 assert.match(sql,/go_battle_reward_claims/);
 assert.match(sql,/PRIMARY KEY\(member_id,battle_kind,battle_key\)/);
 assert.match(sql,/go_battle_award_result\(/);
 assert.match(sql,/battle_win/);
 assert.match(sql,/IF v_first IS NOT NULL THEN\s+v_amount:=10/);
 assert.match(sql,/ELSIF COALESCE\(p_won,false\) THEN/);
 assert.match(sql,/v_award:=public\.go_battle_award_result/);
});

test('API calls new RPCs without affecting other official-card actions',()=>{
 const official=read('app/api/go/official/route.js');
 const store=read('app/api/go/store/route.js');
 assert.match(official,/go_official_draw_v2/);
 assert.match(official,/go_official_resolve_duplicate_v2/);
 assert.match(official,/go_official_mark_seen/);
 assert.match(official,/go_official_unlock_hidden/);
 assert.match(store,/go_store_purchase_v2/);
 assert.match(store,/requiresChoice:pending/);
});

test('duplicate choice survives confirmation errors and X means keep old',()=>{
 const free=read('components/GoFreeDraw.js');
 const store=read('components/GoStore.js');
 assert.match(free,/onClose=\{\(\)=>resolve\(false\)\}/);
 assert.match(store,/onClose=\{\(\)=>resolveDuplicate\(false\)\}/);
 assert.match(free,/requestId:requestRef\.current/);
 assert.match(store,/choiceId:duplicate\.choiceId/);
});
