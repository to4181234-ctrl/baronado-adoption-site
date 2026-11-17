import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isVisitRequestWindow} from '../lib/goVisit.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('KST visit window: 09:00 included, 21:00 excluded, weekends same',()=>{
 assert.equal(isVisitRequestWindow(new Date('2026-11-17T00:00:00Z')),true);
 assert.equal(isVisitRequestWindow(new Date('2026-11-17T11:59:59Z')),true);
 assert.equal(isVisitRequestWindow(new Date('2026-11-17T12:00:00Z')),false);
 assert.equal(isVisitRequestWindow(new Date('2026-11-16T23:59:59Z')),false);
 assert.equal(isVisitRequestWindow(new Date('2026-11-21T00:00:00Z')),true);
});
test('quest Figma 558:466129 keeps 4 distinct lines and header copy',()=>{
 const s=read('components/GoQuests.js');
 for(const title of ['바로나도에 놀러왔개','멍멍이 만나러가기',
 '랜덤 멍카드 뽑기','멍배틀 하기']) assert(s.includes(title),title);
 assert(s.indexOf("id: 'visit'")<s.indexOf("id: 'care'"));
 assert.match(s,/go-quest-title/);
 assert.match(s,/setVisitOpen\(true\)/);
});
test('visit application Figma 558:479032, 558:607591, 558:607639 preserve 294x352 modal',()=>{
 const s=read('app/figma-prelaunch-quests.css');
 const c=read('components/GoVisitPanel.js');
 assert.match(s,/width:294px;max-width:100%;height:352px/);
 assert.match(s,/50dvh - 232px\),162px/);
 assert.match(c,/GoVisitPanel\(\{ embedded=false \}/);
 assert.match(c,/isPending/);
 assert.match(c,/statusExpired/);
 assert.match(c,/!state\?\.canRequestNow/);
});
test('Figma 577:881533 real-time friend battle remains a working room flow',()=>{
 const c=read('components/GoFriendBattle.js');
 const s=read('app/figma-stage5-battle.css');
 for(const value of ['실시간 1:1 멍배틀','방 코드 생성하기',
   '방 코드 입력해서 입장하기','friend-pvp-create','friend-pvp-join'])
   assert(c.includes(value),value);
 assert.match(s,/top:58px;left:16px;right:16px/);
 assert.match(s,/margin:12px 0 0!important;border:0;border-radius:6px/);
 assert.match(c,/mutate\(\{action:'create'\}\)/);
 assert.match(c,/mutate\(\{action:'join',invite:invite\.trim\(\)\}\)/);
});
test('storage backup baseline includes ALL 176 objects and a read-only offline verifier',()=>{
 const baseline=JSON.parse(read('docs/releases/go2-storage-baseline-20261117.json'));
 assert.equal(baseline.buckets['dog-images'].objects,82);
 assert.equal(baseline.buckets['go-cards'].objects,94);
 assert.equal(baseline.buckets['go-official-cards'].objects,0);
 assert.equal(baseline.buckets['dog-images'].bytes+baseline.buckets['go-cards'].bytes,57596793);
 const script=read('scripts/verify-go-storage-backup.py');
 assert.match(script,/hashlib\.sha256/);
 assert.match(script,/refusing symlink/);
 assert.doesNotMatch(script,/rm -rf|DELETE FROM|supabase\.storage\.from\(.+\.remove/);
});
