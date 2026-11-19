import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {albumRoster,albumPreview,albumProgress,ALBUM_PREVIEW_LIMIT} from '../lib/goAlbumRoster.js';
import {availableStoreDogs} from '../lib/goStore.js';
import {vibrateHiddenUnlock} from '../lib/goBattleHaptics.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const dogs=Array.from({length:9},(_,i)=>({id:'dog-'+i,name:'강아지 '+i,adopted:i>=7}));
const catalog=dogs.map(d=>({dogId:d.id,publishedComplete:true,collected:0,hidden:{unlocked:false}}));

test('album is 3x2 until one tap expands all dogs and one tap collapses',()=>{
 const counts={'dog-0':2,'dog-7':3};
 const roster=albumRoster(dogs,catalog,counts,true);
 assert.equal(ALBUM_PREVIEW_LIMIT,6);
 assert.equal(roster.length,8,'unowned adopted dog remains hidden');
 assert.equal(albumPreview(roster,false).length,6);
 assert.ok(albumPreview(roster,false).every(d=>!d.adopted));
 assert.equal(albumPreview(roster,true).length,8);
 assert.equal(albumPreview(roster,true).at(-1).id,'dog-7');
 assert.equal(albumPreview(roster,false).length,6);
 assert.deepEqual(albumProgress(roster),{collected:1,total:7});
 assert.deepEqual(counts,{'dog-0':2,'dog-7':3});
});

test('existing official-only adopted card remains for owner, not for strangers',()=>{
 const adopted=[{id:'owned',name:'구름',adopted:true}];
 const regular=[{dogId:'owned',publishedComplete:true,collected:1,hidden:{unlocked:false}}];
 assert.equal(albumRoster(adopted,regular,{},true).length,1);
 assert.equal(albumRoster(adopted,regular,{},false).length,0);
 assert.deepEqual(albumProgress(albumRoster(adopted,regular,{},true)),{collected:0,total:0});
});

test('specific store picker uses official OR personal ownership and includes a completed dog',()=>{
 const base={available:true,publishedComplete:true,adopted:false,thumbnailUrl:'sprite'};
 const cards=owned=>[1,2,3,4].map(slot=>({slot,owned}));
 const result=availableStoreDogs([
  {...base,dogId:'1',name:'버디',collected:4,personalCount:0,slots:cards(true)},
  {...base,dogId:'2',name:'뽀실',collected:0,personalCount:1,slots:cards(false)},
  {...base,dogId:'3',name:'깡지',collected:0,personalCount:0,slots:cards(false)},
  {...base,dogId:'4',name:'오레오',adopted:true,slots:cards(false)}
 ]);
 assert.equal(result.length,3);
 assert.deepEqual(result.map(d=>d.hasAnyCard),[true,true,false]);
 assert.deepEqual(result.map(d=>d.missing),[0,4,4]);
});

test('new care excludes adopted dogs without removing historical battle cards',()=>{
 const target=read('app/api/go/quests/care-target/route.js');
 const interaction=read('app/api/go/interaction/route.js');
 const battle=read('lib/server/goBattleOfficial.js');
 assert.match(target,/\.eq\('adopted',false\)/);
 assert.match(interaction,/dog\.data\.adopted/);
 assert.match(battle,/go_official_owned/);
 assert.doesNotMatch(battle,/\.eq\('adopted',false\)/);
});

test('admin filters and date sort preserve original image editor and publish gate',()=>{
 const ui=read('app/admin/go/pixels/page.js'),api=read('app/api/admin/go/pixels/route.js');
 assert.match(ui,/입양 완료/);assert.match(ui,/최신 등록순/);assert.match(ui,/오래된 등록순/);
 assert.match(ui,/대표 썸네일 픽셀 일러스트/);assert.match(ui,/upload\(dog\.dogId/);
 assert.match(api,/created_at/);assert.match(api,/officialReady/);
 assert.doesNotMatch(read('app/admin/go/visit/page.js'),/v10-admin-back/);
});

test('HIDDEN becomes NEW at four normal cards and first reveal uses hologram + haptics',()=>{
 const official=read('components/GoStage2OfficialCards.js'),detail=read('components/GoAlbumCardDetail.js');
 const css=read('components/GoAlbumCardDetail.css'),haptics=read('lib/goBattleHaptics.js');
 assert.match(official,/s2-official-hidden-new/);assert.match(official,/official firstUnlock/);
 assert.match(detail,/go-album-hologram/);assert.match(detail,/GoHiddenRetroBurst/);
 assert.match(read('components/GoHiddenRetroBurst.js'),/className="go-album-hidden-burst"/);
 assert.match(detail,/vibrateHiddenUnlock/);assert.match(css,/go-hidden-holo-primary/);
 assert.match(haptics,/battleVibrationEnabled\(\)/);
 assert.equal(vibrateHiddenUnlock(),false,'unsupported Node/IOS browser does not vibrate');
});
