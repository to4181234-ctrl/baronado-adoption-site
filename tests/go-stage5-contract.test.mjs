import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {friendPvpResult,FRIEND_PVP_RECONNECT_MS,FRIEND_PVP_POLL_MS} from '../lib/goPvpRules.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('stage5 friend PvP: power + charm, tie means draw and no element bonus',()=>{
 assert.deepEqual(friendPvpResult({power:3,charm:4},{power:4,charm:5}),
  {hostScore:7,guestScore:9,winner:'guest'});
 assert.deepEqual(friendPvpResult({power:4,charm:4},{power:3,charm:5}),
  {hostScore:8,guestScore:8,winner:'draw'});
 assert.equal(FRIEND_PVP_RECONNECT_MS,30000);
 assert(FRIEND_PVP_POLL_MS<=3000);
});
test('stage5 separate feature flag protects both API and UI, leaves random mode',()=>{
 const api=read('app/api/go/pvp/route.js');
 const ui=read('components/GoBattle.js');
 assert.match(api,/MEONGGO_STAGE5_PVP_ENABLED/);
 assert.match(ui,/GO_STAGE5_UI_ENABLED/);
 assert.match(ui,/실시간 1:1 멍배틀/);
 assert.match(ui,/<Game\/>/);
});
test('stage5 SQL: lost connection resets both readiness, 30s grace, single KST battle quest',()=>{
 const sql=read('docs/sql/stage5-friend-pvp-and-random-battle-DRAFT.sql');
 assert.match(sql,/interval '30 seconds'/);
 assert.match(sql,/interval '6 seconds'/);
 assert.match(sql,/host_ready=false,guest_ready=false/);
 assert.match(sql,/go_battle_reward_random/);
 assert.match(sql,/quest:battle:/);
 assert.match(sql,/ON CONFLICT\(member_id,source_key\) DO NOTHING/);
 assert.match(sql,/FOR UPDATE/);
});
test('stage5 revision: HIDDEN slot5 is available in 1:1 PvP via the reviewed migration',()=>{
 const sql=read('docs/sql/predeploy-hidden-stats-pvp-DRAFT.sql');
 const api=read('app/api/go/pvp/route.js');
 assert.match(sql,/p_slot=5/);
 assert.match(api,/\.in\('slot',\[1,2,3,4,5\]\)/);
 assert.match(api,/body\.slot<=5/);
});
test('stage5 Figma 617:163536: shared quest describes random and friend battles',()=>{
 const quests=read('components/GoQuests.js');
 const pvp=read('components/GoFriendBattle.js');
 assert.match(quests,/랜덤 또는 친구 1:1 멍배틀/);
 assert.match(pvp,/room\.otherConnected===false/);
 assert.match(pvp,/reconnectDeadline/);
});
