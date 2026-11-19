import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('1:1 selected card gets the same visible 3px yellow border as random battle',()=>{
 const css=read('components/GoFriendBattle.css');
 const random=read('components/GoBattle.css');
 const jsx=read('components/GoFriendBattle.js');
 assert.match(random,/is-picked:after\{content:"";position:absolute;inset:0;border:3px solid #fade40/);
 assert.match(css,/friend-pvp-card\.is-selected:after\{content:'';position:absolute;left:0;top:0;width:100%;aspect-ratio:166\/265;border:3px solid #fade40/);
 assert.doesNotMatch(css,/inset:-5px -5px 35px/);
 assert.match(jsx,/aria-pressed=\{selected\}/);
 assert.match(jsx,/selected=\{selectedKey\(room\.myCard\)===selectedKey\(card\)\}/);
});

test('1:1 duplicate selected-card summary is gone; ready status is still visible',()=>{
 const jsx=read('components/GoFriendBattle.js'),css=read('components/GoFriendBattle.css');
 assert.doesNotMatch(jsx,/className="friend-pvp-current"/);
 assert.doesNotMatch(css,/\.friend-pvp-current/);
 assert.match(jsx,/friend-pvp-ready-state/);
 assert.match(jsx,/room\.mySelected\?'카드 선택 완료'/);
 assert.match(jsx,/onClick=\{\(\)=>mutate\(\{action:'ready',roomId:room\.roomId\}\)\}/);
});

test('READY button remains available when card chosen while peer heartbeat refreshes',()=>{
 const jsx=read('components/GoFriendBattle.js');
 assert.match(jsx,/disabled=\{busy\|\|!room\.mySelected\}/);
 assert.doesNotMatch(jsx,/disabled=\{busy\|\|!room\.mySelected\|\|room\.otherConnected===false\}/);
});

test('server READY grace migration is local-tested and retains the 30s cancellation',()=>{
 const sql=read('docs/sql/meonggo-friend-pvp-heartbeat-grace-20261119-DRAFT.sql');
 const runner=read('scripts/verify-go-integration-local.sh');
 const fixture=read('tests/fixtures/go-pvp-ready-reconnect-assert.sql');
 assert.match(sql,/interval '15 seconds'/);
 assert.doesNotMatch(sql,/interval '6 seconds'/);
 assert.match(sql,/interval '30 seconds'/);
 assert.match(runner,/go-pvp-ready-reconnect-assert\.sql/);
 assert.match(fixture,/10s jitter incorrectly revoked host READY/);
 assert.match(fixture,/20s true interruption failed to clear READY/);
 assert.match(fixture,/both READY failed to finish match/);
});

test('an older background sync cannot override a newer select or READY response',()=>{
 const jsx=read('components/GoFriendBattle.js');
 assert.match(jsx,/mutationEpoch=useRef\(0\)/);
 assert.match(jsx,/mutationEpoch\.current\+=1/);
 assert.match(jsx,/const epoch=mutationEpoch\.current/);
 assert.match(jsx,/active&&!mutating\.current&&epoch===mutationEpoch\.current/);
});

test('1:1 reveals both cards through random battle shuffle/pick/flip/show before collision',()=>{
 const pvp=read('components/GoFriendBattle.js'),random=read('components/GoBattle.js');
 const css=read('components/GoFriendBattle.css');
 for(const when of ["pick:750","flip:1220","shown:1700","fight:2550"]){
  assert.ok(pvp.includes(when),when);assert.ok(random.includes(when),when);
 }
 assert.match(pvp,/setAnimatedRound\(key\)/);
 assert.match(pvp,/animatedRound!==room\.roomId\+':'\+room\.round/);
 assert.match(pvp,/setRevealStage\('shuffle'\)/);
 assert.match(pvp,/setAnimation\('reveal'\)/);
 assert.match(pvp,/setRevealStage\('selected'\)/);
 assert.match(pvp,/setRevealStage\('flip'\)/);
 assert.match(pvp,/setRevealStage\('shown'\)/);
 assert.match(pvp,/setAnimation\('fight'\)/);
 assert.match(pvp,/animation==='reveal'\?<\>/);
 assert.match(pvp,/friend-pvp-reveal-pair/);
 assert.match(pvp,/animation==='fight'\?<\>/);
 assert.match(pvp,/reveal\.fight\+FRIEND_PVP_ANIMATION_MS/);
 assert.match(css,/\.friend-pvp-reveal-pair/);
 assert.match(pvp,/meong-battle-phase-fight/);
 assert.match(read('components/GoBattle.css'),/\.meong-battle-phase-fight \.meong-battle-fighter/);
});

test('existing 3 impact beats, sounds, outcome and no pre-ready peer card leak remain',()=>{
 const pvp=read('components/GoFriendBattle.js'),api=read('app/api/go/pvp/route.js');
 assert.match(pvp,/\[\[1,920\],\[2,1970\],\[3,3050\]\]/);
 assert.match(pvp,/audio\.current\?\.playImpact\(level\);vibrateBattleHit\(level\)/);
 assert.match(pvp,/friendPvpOutcome\(winner,room\?\.role\)/);
 assert.match(api,/visualCard\(db,data\.otherCard\)/);
 assert.match(pvp,/room\.status==='completed'&&room\.myCard&&room\.otherCard/);
});
