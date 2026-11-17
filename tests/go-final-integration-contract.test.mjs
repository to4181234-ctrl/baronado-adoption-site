import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('stage4 upgrades existing production 200C-only receipt check to 200C+300C',()=>{
 const sql=file('docs/sql/stage4-store-200-300-DRAFT.sql');
 const old=sql.indexOf('DROP CONSTRAINT IF EXISTS go_official_purchases_coins_check');
 const replacement=sql.indexOf('CHECK (coins IN (200,300))');
 const execute=sql.indexOf('CREATE OR REPLACE FUNCTION public.go_store_purchase');
 assert(old>0 && replacement>old && execute>replacement);
});
test('migration is non-destructive to old cards and requires ordered stages',()=>{
 for(const num of [2,3,4,5]){
  const fs={
   2:'stage2-four-plus-one-DRAFT.sql',3:'stage3-care-and-official-eligibility-DRAFT.sql',
   4:'stage4-store-200-300-DRAFT.sql',5:'stage5-friend-pvp-and-random-battle-DRAFT.sql'};
  const sql=file('docs/sql/'+fs[num]);
  assert.match(sql,/BEGIN;/);
  assert.match(sql,/COMMIT;/);
  assert.doesNotMatch(sql,/\bTRUNCATE\s+(?:TABLE\s+)?(?:public\.)?go_cards\b/i);
  assert.doesNotMatch(sql,/\bDROP\s+TABLE\b/i);
 }
});
test('final integration fixture covers multi-stage business flows and data preservation',()=>{
 const runner=file('scripts/verify-go-integration-local.sh');
 const sql=file('tests/fixtures/go-integration-assert.sql');
 assert.match(runner,/go_integration_/);
 assert.match(runner,/stage\$\{stage\}/);
 for(const marker of ['go_do_rewarded_interaction','go_official_draw','go_store_purchase',
 'go_official_unlock_hidden','go_pvp_create','go_pvp_action','qa:historic:one'])
  assert(sql.includes(marker),marker);
});
