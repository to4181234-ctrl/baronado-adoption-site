import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Figma battle landing 577:881499 has two approved entry choices and the shared records panel',()=>{
 const battle=file('components/GoBattle.js');
 assert.match(battle,/data-figma-frame="577:881499"/);
 assert.match(battle,/실시간 1:1 멍배틀/);
 assert.match(battle,/랜덤 멍배틀/);
 assert.match(battle,/GoAlbumBattleRecords dogs=\{dogs\} records=\{records\}/);
 assert.match(battle,/mode==='random'/);
 assert.match(battle,/mode==='friend'/);
 assert.match(battle,/search\.has\('room'\)/);
 assert.match(battle,/fetch\('\/api\/go\/collection'/);
});

test('battle and album records reuse the same pixel SVG layers and next/previous pager',()=>{
 const panel=file('components/GoAlbumBattleRecords.js');
 assert.match(panel,/album-panel-'\+name\+'\.svg'/);
 assert.match(panel,/이전/);assert.match(panel,/다음/);
 assert.match(panel,/compact=false/);
 assert.match(panel,/Math\.min\(page,total-1\)/);
 assert.match(panel,/entries\[current\]/);
 for(const n of ['bg','outer','inner'])assert.ok(existsSync(new URL('../public/figma-v3/album-panel-'+n+'.svg',import.meta.url)));
});

test('member-dog last card draft scopes deletes and leaves others intact',()=>{
 const sql=file('docs/restoration/stage3-last-card-pvp-DRAFT.sql');
 assert.match(sql,/ADD COLUMN IF NOT EXISTS dog_id uuid/);
 assert.match(sql,/BEFORE INSERT ON public\.go_pvp_records/);
 assert.match(sql,/DELETE FROM public\.go_pvp_records WHERE member_id=OLD\.member_id AND dog_id=OLD\.dog_id/);
 assert.match(sql,/NOT EXISTS \(SELECT 1 FROM public\.go_official_owned/);
 assert.match(sql,/NOT EXISTS \(SELECT 1 FROM public\.go_official_hidden/);
 assert.match(sql,/AFTER DELETE ON public\.go_official_owned/);
 assert.match(sql,/AFTER DELETE ON public\.go_official_hidden/);
 assert.doesNotMatch(sql,/DELETE FROM public\.go_pvp_records WHERE opponent_id/);
});

test('20-game UI limitation is distinct from cumulative PvP record counts',()=>{
 const server=file('app/api/go/pvp/route.js');
 assert.match(server,/select\('id',\{count:'exact',head:true\}\)/);
 assert.match(server,/\.limit\(20\)/);
 const friend=file('components/GoFriendBattle.js');
 assert.doesNotMatch(friend,/기존 카드를 삭제해도 완료된 전적은 유지돼요/);
});

test('friend card-picker restores approved search/sort on both the UI and server pagination',()=>{
 const friend=file('components/GoFriendBattle.js'),api=file('app/api/go/pvp/route.js');
 assert.match(friend,/제목·강아지 이름/);
 assert.match(friend,/등록 순서ㅣ/);
 assert.match(friend,/mode:'cards',kind,page:String\(page\),q:searched,order/);
 assert.match(friend,/kind==='official'\?'active'/);
 assert.match(api,/dogsMatching=await db\.from\('dogs'\)/);
 assert.match(api,/ownQuery\.or\(/);
 assert.match(api,/order\('captured_at',\{ascending\}\)/);
 assert.match(api,/filter\(x=>!q/);
 assert.match(api,/visible\.slice\(offset,offset\+12\)/);
 assert.match(api,/filteredTotal/);
 assert.match(api,/\.eq\('member_id',member\.id\)/);
});

test('dog album delete confirmation states the approved final-card rule',()=>{
 const album=file('components/GoDogAlbum.js');
 assert.match(album,/해당 강아지의 마지막 카드를 삭제하면/);
 assert.match(album,/도감 획득 기록과 배틀 전적도 사라져요/);
});
