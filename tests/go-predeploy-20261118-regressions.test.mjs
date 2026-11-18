import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {battleCardKey,validBattleSlot} from '../lib/server/goBattleOfficial.js';
import {battleScore} from '../lib/goBattleRules.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('random battle can distinguish official slot 1..5 from custom cards',()=>{
 assert.equal(validBattleSlot('official',5),true);
 assert.equal(validBattleSlot('official',6),false);
 assert.equal(validBattleSlot('camera',null),true);
 assert.equal(validBattleSlot('camera',5),false);
 assert.notEqual(battleCardKey({id:'dog',kind:'official',slot:4}),battleCardKey({id:'dog',kind:'official',slot:5}));
 assert.notEqual(battleCardKey({id:'dog',kind:'official',slot:1}),battleCardKey({id:'dog',kind:'camera'}));
 const s=read('components/GoBattle.js');
 assert.match(s,/kind==='official'/);
 assert.match(s,/kind==='camera'/);
 assert.match(s,/cardKey\(selected\[0\]\)===cardKey\(c\)/);
 assert.match(s,/secondOwnerId:selected\[1\]\.ownerId/);
});

test('random battle server signs kind, slot and opponent identity',()=>{
 const api=read('app/api/go/battle/route.js');
 assert.match(api,/first\.kind,first\.slot\|\|0/);
 assert.match(api,/second\.kind,second\.slot\|\|0/);
 assert.match(api,/secondOwner,expires/);
 assert.match(api,/getOfficialOwned/);
 assert.match(api,/listOfficialBattleCards/);
 assert.match(api,/first_kind:firstRef\.kind/);
 assert.match(read('docs/sql/predeploy-random-official-battle-DRAFT.sql'),/first_kind text NOT NULL DEFAULT 'camera'/);
});

test('HIDDEN power and charm are generated at unlock only, stored and used in both PvP modes',()=>{
 const sql=read('docs/sql/predeploy-hidden-stats-pvp-DRAFT.sql');
 assert.match(sql,/INSERT INTO public\.go_official_hidden\(member_id,dog_id,power,charm\)/);
 assert.match(sql,/ON CONFLICT\(member_id,dog_id\) DO NOTHING/);
 assert.match(sql,/UPDATE public\.go_official_hidden SET power=.* WHERE power IS NULL/);
 assert.match(sql,/UPDATE public\.go_official_hidden SET charm=.* WHERE charm IS NULL/);
 assert.match(sql,/p_slot=5/);
 assert.match(read('app/api/go/official/route.js'),/power:special\?\.power\?\?null,charm:special\?\.charm\?\?null/);
 assert.match(read('app/api/go/pvp/route.js'),/body\.slot<=5/);
});

test('care quest randomly routes to a non-max-affinity adoption dog including unowned dogs, without awarding on navigation',()=>{
 const page=read('components/GoQuests.js');
 const api=read('app/api/go/quests/care-target/route.js');
 assert.match(page,/onClick=\{goToCare\}/);
 assert.match(page,/router\.push\('\/go\/interact\/'/);
 assert.match(api,/new Set/);
 assert.match(api,/from\('dogs'\)/);
 assert.doesNotMatch(api,/from\('go_cards'\)|from\('go_official_owned'\)|from\('go_official_hidden'\)/);
 assert.match(api,/levels\.get\(id\)\|\|0\)<10/);
 assert.match(api,/randomInt\(candidates\.length\)/);
 assert.doesNotMatch(api,/go_coin_wallets|go_coin_transactions|rpc\(/);
});

test('completed quests do not route, employee code and timer have nonoverlapping positions',()=>{
 const quest=read('components/GoQuests.js');
 const css=read('app/figma-prelaunch-quests.css');
 assert.match(quest,/task\.completed\s*\? <span/);
 assert.match(css,/go-visit-dialog-code\{\s*position:absolute;top:231px/);
 assert.match(css,/has\(\.go-visit-dialog-code\) \.go-visit-dialog-desc\{top:158px\}/);
 assert.match(css,/status\[role=timer\]\{top:254px\}/);
});

test('local/passwordless preview requires explicit protection; production retains admin gate',()=>{
 const server=read('lib/server/adminSession.js');
 const guard=read('components/AdminGuard.js');
 assert.match(server,/process\.env\.NODE_ENV === 'development'/);
 assert.match(server,/ADMIN_PASSWORDLESS_PREVIEW === '1'/);
 assert.match(server,/VERCEL_ENV === 'preview'/);
 assert.match(server,/if \(adminPasswordlessPreview\(\)\) return true/);
 assert.match(guard,/passwordlessPreview/);
});

test('battle winner uses stored power and charm, no reroll at view time',()=>{
 const result=battleScore({power:3,charm:4,element:'햇살'},{power:3,charm:4,element:'별빛'});
 assert.equal(result.scoreA,7);
 assert.equal(result.scoreB,7);
 assert.equal(result.winner,'draw');
});
