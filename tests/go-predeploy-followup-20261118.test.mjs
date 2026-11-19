import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseBattleIdentity, listOfficialBattleCards, getOfficialOwned} from '../lib/server/goBattleOfficial.js';
const read = name => readFileSync(new URL('../'+name,import.meta.url),'utf8');
const member={id:'11111111-1111-4111-8111-111111111111',nickname:'테스트'};
const dog='33333333-3333-4333-8333-333333333333';
const card='55555555-5555-4555-8555-555555555555';
const validId=x=>typeof x==='string'&&/^[a-f0-9-]{36}$/i.test(x);

test('battle identities preserve 5th official slot and reject unknown card kinds or ambiguous numbers',()=>{
 assert.deepEqual(parseBattleIdentity({firstId:dog,firstKind:'official',firstSlot:'5'},'first',validId),{id:dog,kind:'official',slot:5});
 assert.deepEqual(parseBattleIdentity({firstId:card},'first',validId),{id:card,kind:'camera',slot:null});
 for (const input of [
  {firstId:dog,firstKind:'unknown',firstSlot:5},
  {firstId:dog,firstKind:'official',firstSlot:'5.0'},
  {firstId:dog,firstKind:'official',firstSlot:6},
  {firstId:dog,firstKind:'official',firstSlot:null},
  {firstId:dog,firstKind:'camera',firstSlot:5},
  {firstId:'bogus',firstKind:'official',firstSlot:5}
 ])assert.equal(parseBattleIdentity(input,'first',validId),null,JSON.stringify(input));
});

function dbFixture(){
 const data={
  go_official_owned:[{member_id:member.id,dog_id:dog,slot:2,power:3,charm:4,acquired_at:'2026-11-18T01:00:00Z'}],
  go_official_hidden:[{member_id:member.id,dog_id:dog,power:5,charm:2,unlocked_at:'2026-11-18T03:00:00Z'}],
  dogs:[{id:dog,name:'뽀실'}],
  go_official_sets:[{dog_id:dog,current_version:'aaaa'}],
  go_dog_pixel_assets:[{dog_id:dog,care_path:'care.png',thumbnail_path:'cover.png',is_published:true}],
  go_official_assets:[...([1,3,4].map(slot=>({version_id:'aaaa',slot,title:'공식 카드 '+slot,display_path:'official/'+slot+'.png'}))),{version_id:'aaaa',slot:2,title:'평범한 공식 카드',display_path:'official/2.png'},{version_id:'aaaa',slot:5,title:'특별 HIDDEN',display_path:'official/5.png'}]
 };
 return {
  from(name){
   let rows=[...(data[name]||[])];
   const query={
    select(){return query;},
    not(key,op,value){rows=rows.filter(r=>r[key]!==null);return query;},
    eq(key,value){rows=rows.filter(r=>r[key]===value);return query;},
    in(key,values){rows=rows.filter(r=>values.includes(r[key]));return query;},
    maybeSingle(){return Promise.resolve({data:rows[0]||null,error:null});},
    then(done,fail){return Promise.resolve({data:rows,error:null}).then(done,fail);}
   };
   return query;
  },
  storage:{from(name){assert.equal(name,'go-official-cards');return{
   createSignedUrls:async paths=>({data:paths.map(path=>({signedUrl:'https://test.invalid/'+path})),error:null})
  };}}
 };
}

test('official album battle selection includes normal and unlocked HIDDEN, retaining stable ratings',async()=>{
 const db=dbFixture();
 const all=await listOfficialBattleCards(db,member,'','newest',0,4);
 assert.equal(all.total,2);
 assert.deepEqual(all.cards.map(c=>c.slot),[5,2]);
 const hidden=all.cards[0];
 assert.equal(hidden.kind,'official');
 assert.equal(hidden.ownerId,member.id);
 assert.equal(hidden.title,'특별 HIDDEN');
 assert.deepEqual(hidden.battle.power,5);
 assert.deepEqual(hidden.battle.charm,2);
 assert.match(hidden.imageUrl,/official\/5\.png$/);
 const filtered=await listOfficialBattleCards(db,member,'HIDDEN','newest',0,4);
 assert.equal(filtered.total,1);
 assert.equal(filtered.cards[0].slot,5);
 const owned=await getOfficialOwned(db,member.id,dog,5);
 assert.equal(owned.slot,5);
 assert.equal(owned.power,5);
 assert.equal(owned.charm,2);
});

test('PvP calls the official score 애교, not the custom-only camera rating 매력',()=>{
 const source=read('components/GoFriendBattle.js');
 assert.match(source,/파워 \{card\.power\} · 애교 \{card\.charm\}/);
 assert.match(source,/파워 \+ 애교 합산/);
 assert.doesNotMatch(source,/파워 \+ 매력|파워 \{card\.power\} · 매력/);
});

test('first care quest is included in the five daily care rewards',()=>{
 const api=read('app/api/go/coins/route.js');
 assert.match(api,/row\.event_type === 'care' \|\| row\.event_type === 'quest_care'/);
});

test('isolated SQL QA runs every new predeploy migration twice and tests HIDDEN PvP',()=>{
 const script=read('scripts/verify-go-integration-local.sh');
 const fixture=read('tests/fixtures/go-integration-assert.sql');
 for(const name of ['predeploy-hidden-stats-pvp','predeploy-random-official-battle','quest-care-10-total'])assert.ok(script.includes(name));
 assert.match(script,/for pass in first second; do/);
 assert.match(fixture,/HIDDEN unlock rerolled existing stats/);
 assert.match(fixture,/HIDDEN slot 5 PvP select failed/);
 assert.match(fixture,/first-care reward double counted/);
 assert.match(fixture,/random HIDDEN and camera battle record failed/);
});
