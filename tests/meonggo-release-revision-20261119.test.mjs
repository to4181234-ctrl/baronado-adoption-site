import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {releasedDogs} from '../lib/server/goDogRelease.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const mock=(sets,pixels,assets)=>({from(name){return {select(){return this;},not(){return this;},eq(){return Promise.resolve({data:{go_dog_pixel_assets:pixels}[name]||[],error:null});},then(resolve){resolve({data:({go_official_sets:sets,go_dog_pixel_assets:pixels,go_official_assets:assets})[name],error:null});}}}});
const dog='11111111-1111-4111-8111-111111111111',ver='22222222-2222-4222-8222-222222222222';
const sets=[{dog_id:dog,current_version:ver}];
const pixels=[{dog_id:dog,care_path:'a/care.png',thumbnail_path:'a/thumb.png',is_published:true}];
const assets=Array.from({length:5},(_,i)=>({version_id:ver,slot:i+1,title:'카드 '+(i+1),display_path:'original-card-'+i}));
test('release gate requires all five official slots, care and representative pixel files, and publish',async()=>{
 assert.equal((await releasedDogs(mock(sets,pixels,assets))).has(dog),true);
 assert.equal((await releasedDogs(mock(sets,pixels,assets.slice(0,4)))).size,0);
 assert.equal((await releasedDogs(mock(sets,pixels.map(x=>({...x,care_path:null})),assets))).size,0);
 assert.equal((await releasedDogs(mock(sets,pixels.map(x=>({...x,thumbnail_path:null})),assets))).size,0);
 assert.equal((await releasedDogs(mock(sets,pixels.map(x=>({...x,is_published:false})),assets))).size,0);
 assert.equal((await releasedDogs(mock(sets,pixels,assets.map(x=>({...x,title:''}))))).size,0);
});
test('new administrator pixel upload and release screens exist',()=>{
 const route=read('app/api/admin/go/pixels/route.js'),page=read('app/admin/go/pixels/page.js');
 assert.match(route,/hasAdminSession/);assert.match(route,/sameOrigin/);assert.match(route,/upload\(path,output/);
 assert.match(route,/is_published:false/);assert.match(route,/dog\.officialReady/);
 assert.match(page,/돌보기 픽셀 일러스트/);assert.match(page,/대표 썸네일 픽셀 일러스트/);assert.match(page,/공개/);
});
test('admin landing shows visit certification; old dog edit menu preserved',()=>{
 const landing=read('app/admin/page.js'),dogs=read('app/admin/dogs/page.js');
 assert.match(landing,/redirect\('\/admin\/go\/visit'\)/);assert.match(dogs,/category/);
});
test('official and HIDDEN cards support sorting and owner-only atomic bulk deletion without checkmarks',()=>{
 const album=read('components/GoStage2OfficialCards.js'),api=read('app/api/go/official/route.js'),sql=read('docs/sql/official-card-bulk-delete-20261119-DRAFT.sql');
 assert.match(album,/sortOrder==='newest'/);assert.match(album,/selectedSlots\.length/);
 assert.match(album,/aria-pressed=\{selectionMode\?/);assert.doesNotMatch(album,/<span className="s2-official-selected"/);
 assert.match(api,/go_official_bulk_delete/);assert.match(sql,/member_id=p_member/);assert.match(sql,/FOR UPDATE/);
 const custom=read('components/GoCard.js');assert.doesNotMatch(custom,/<span className="go-bulk-check"/);
});
test('all personal album categories launch same approved Figma detail popup and sound',()=>{
 const component=read('components/GoAlbumCardDetail.js'),custom=read('components/GoDogAlbum.js'),official=read('components/GoStage2OfficialCards.js');
 assert.match(custom,/albumView=\{!selectionMode\}/);assert.match(official,/GoAlbumCardDetail official/);
 assert.match(component,/GoElementSparkles/);assert.match(component,/createCompletionSound/);
 assert.match(component,/모두의 도감에서 보기/);assert.match(component,/GoSoundButton/);
});
test('HIDDEN uses source Figma hologram pixel asset, not approximate gradient',()=>{
 const face=read('components/GoCardFace.js');const file=new URL('../public/figma-official/hidden-hologram-pixels-681-290128.png',import.meta.url);
 assert.ok(statSync(file).size>1000);assert.match(face,/hidden-hologram-pixels-681-290128\.png/);
});
test('store picker exposes known dog silhouette, unrevealed dogs hidden, no arbitrary blue',()=>{
 const store=read('components/GoStore.js');const css=read('app/figma-stage4-store.css');
 assert.match(store,/figmaSprite\(dog.name,'shadow'\)/);assert.match(store,/album-empty-collar\.png/);
 assert.doesNotMatch(store,/className="s4-store-run"/);assert.match(css,/color:#171713!important/);
});
test('daily quest completed state is muted and reward changes to 완료, with uniform body size',()=>{
 const js=read('components/GoQuests.js'),css=read('app/figma-prelaunch-quests.css');
 assert.match(js,/task.completed\?'완료'/);assert.match(js,/task\.completed \? ' is-complete'/);
 assert.match(css,/color:#999!important/);assert.match(css,/color:#b5b5b5!important/);
 assert.match(css,/font-size:11px!important/);
});
test('public data and care navigation gate unreleased dog IDs at server layer',()=>{
 for(const file of ['app/api/go/official/route.js','app/api/go/quests/care-target/route.js','app/api/go/interaction/route.js','app/api/go/store/route.js','lib/server/goCards.js'])
 assert.match(read(file),/dogReleased|releasedDogs/,file);
});
test('prepared SQL restricts all three purchase/draw/unlock procedures, preserving legacy ownership rows',()=>{
 const ddl=read('docs/sql/meonggo-dog-release-gate-20261119-DRAFT.sql');
 const rpc=read('docs/sql/meonggo-release-filtered-rpcs-20261119-DRAFT.sql');
 assert.match(ddl,/CREATE TABLE IF NOT EXISTS public\.go_dog_pixel_assets/);
 assert.equal((rpc.match(/CREATE OR REPLACE FUNCTION/g)||[]).length,3);
 assert.ok((rpc.match(/go_dog_release_ready/g)||[]).length>=4);
 assert.doesNotMatch(ddl,/DELETE FROM public\.go_cards/);
});
