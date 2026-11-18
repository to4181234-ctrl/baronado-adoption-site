import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import fs from 'node:fs';import {runtimeRequire,runtimeRoot,repoRoot,scriptRoot} from './paths.mjs';const pg=runtimeRequire('pg');import {createRequire} from 'node:module';
const origin='http://localhost:55436';const passed=[];
const db=new pg.Client({host:'127.0.0.1',port:55432,user:'postgres',password:'qa-local-only',database:'go_integration_http'});await db.connect();
await db.query('GRANT USAGE ON SCHEMA storage TO service_role,anon,authenticated; GRANT ALL ON ALL TABLES IN SCHEMA storage TO service_role; GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO service_role;');
const {serviceKey,anonKey,authenticatedKey}=JSON.parse(fs.readFileSync(runtimeRoot+'/local-config.json'));
async function store(path,body,type='application/json'){const r=await fetch('http://127.0.0.1:55435/storage/v1'+path,{method:'POST',headers:{authorization:'Bearer '+serviceKey,apikey:serviceKey,'Content-Type':type},body:Buffer.isBuffer(body)?body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});const text=await r.text();assert(r.ok,path+' '+text);}
for(const name of ['go-cards','go-official-cards'])await store('/bucket',{id:name,name,public:false});
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1kAAAAASUVORK5CYII=','base64');
for(const name of ['qa/a.png','qa/b.png'])await store('/object/go-cards/'+name,png,'image/png');
for(const dog of ['A','B'])for(let n=1;n<=4;n++)await store('/object/go-official-cards/qa/display'+dog+n,png,'image/png');
passed.push('Official Supabase Storage service: real uploads to isolated private buckets');
for(const key of [anonKey,authenticatedKey]){const denied=await fetch('http://127.0.0.1:55435/rest/v1/rpc/go_store_purchase',{method:'POST',headers:{authorization:'Bearer '+key,apikey:key,'Content-Type':'application/json'},body:JSON.stringify({p_member:'11111111-1111-4111-8111-111111111111',p_request:randomUUID(),p_mode:'random',p_dog:null,p_slot:null})});assert([401,403].includes(denied.status));}passed.push('Real PostgREST denies privileged purchase RPC to anon and authenticated JWT roles');

async function call(route,body,cookie='',expected=200){const r=await fetch(origin+route,{signal:AbortSignal.timeout(20000),method:body===undefined?'GET':'POST',headers:{origin,host:'localhost:55436','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await r.json();assert.equal(r.status,expected,route+' '+JSON.stringify(data));return {data,cookie:r.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ')};}
const a=(await call('/api/go/session',{action:'login',nickname:'qausera',password:'qa-pass-only'})).cookie;assert.match(a,/baronado_go=/);
const b=(await call('/api/go/session',{action:'login',nickname:'qauserb',password:'qa-pass-only'})).cookie;assert(a!==b);passed.push('Two real nickname/password logins, HMAC cookies and DB session checks');
await call('/api/go/store',undefined,'',401);const me=(await call('/api/go/session',undefined,a)).data;assert.equal(me.member.nickname,'기록가가');passed.push('Unauthenticated purchase denied; real session read succeeds');
const coins=(await call('/api/go/coins',undefined,a)).data;assert.equal(coins.balance,800);
const id=randomUUID();const purchase={mode:'specific',requestId:id,dogId:'33333333-3333-4333-8333-333333333333'};
const first=(await call('/api/go/store',purchase,a)).data;assert(first.ok);const retry=(await call('/api/go/store',purchase,a)).data;assert(retry.ok);const c=(await call('/api/go/coins',undefined,a)).data;assert.equal(c.balance,500);const count=await db.query('select count(*)::int n from go_official_purchases where request_id=$1',[id]);assert.equal(count.rows[0].n,1);passed.push('300C HTTP purchase/retry gives one receipt and one debit');
await call('/api/go/store',{mode:'specific',requestId:randomUUID(),dogId:purchase.dogId,slot:2},a,400);passed.push('Direct card-number selection rejected');
const random=(await call('/api/go/store',{mode:'random',requestId:randomUUID()},a)).data;assert(random.ok);assert.equal((await call('/api/go/coins',undefined,a)).data.balance,300);passed.push('200C random HTTP purchase and wallet balance');
const room=(await call('/api/go/pvp',{action:'create'},a)).data;assert(room.ok);const roomId=room.roomId;
await call('/api/go/pvp',{action:'join',invite:room.inviteCode},b);
await call('/api/go/pvp',{action:'select',roomId,kind:'camera',cardId:'66666666-6666-4666-8666-666666666666'},a,409);
await call('/api/go/pvp',{action:'select',roomId,kind:'camera',cardId:'55555555-5555-4555-8555-555555555555'},a);
await call('/api/go/pvp',{action:'select',roomId,kind:'camera',cardId:'66666666-6666-4666-8666-666666666666'},b);
const oneReady=(await call('/api/go/pvp',{action:'ready',roomId},a)).data;assert.equal(oneReady.otherCard,null);
const result=(await call('/api/go/pvp',{action:'ready',roomId},b)).data;assert.equal(result.status,'completed');assert(result.myCard&&result.otherCard);
const historyA=(await call('/api/go/pvp?mode=history',undefined,a)).data;const historyB=(await call('/api/go/pvp?mode=history',undefined,b)).data;assert.equal(historyA.stats.losses,1);assert.equal(historyB.stats.wins,1);
await call('/api/go/pvp',{action:'ready',roomId},b,409);assert.equal((await call('/api/go/pvp?mode=history',undefined,b)).data.stats.wins,1);passed.push('Two-member real HTTP PvP: room/join/ownership/hidden opponent/ready/result/history/retry');
const refresh=(await call('/api/go/pvp',{action:'sync',roomId},a)).data;assert.equal(refresh.status,'completed');passed.push('Completed PvP result recovered by HTTP read');

const admin=(await call('/api/admin/login',{password:'qa-admin-pass'})).cookie;assert.match(admin,/baronado_admin=/);
const draft=(await call('/api/admin/go/official',{action:'newDraft',dogId:'44444444-4444-4444-8444-444444444444'},admin)).data;
const sharp=createRequire(repoRoot+'/package.json')('sharp');const raw=Buffer.alloc(320*320*3);let pixelSeed=123456;for(let i=0;i<raw.length;i++){pixelSeed^=pixelSeed<<13;pixelSeed^=pixelSeed>>>17;pixelSeed^=pixelSeed<<5;raw[i]=pixelSeed&255;}const image=await sharp(raw,{raw:{width:320,height:320,channels:3}}).png().toBuffer();assert(image.length>=1000);
for(let slot=1;slot<=5;slot++){
 const form=new FormData();for(const [k,v] of Object.entries({dogId:'44444444-4444-4444-8444-444444444444',versionId:draft.versionId,slot:String(slot),title:slot===5?'':'QA official '+slot,cropX:'0.5',cropY:'0.5',zoom:'1'}))form.set(k,v);form.set('file',new Blob([image],{type:'image/png'}),'qa.png');
 const response=await fetch(origin+'/api/admin/go/official',{method:'PUT',headers:{origin,host:'localhost:55436',Cookie:admin},body:form,signal:AbortSignal.timeout(20000)});const data=await response.json();assert.equal(response.status,201,JSON.stringify(data));
}
const publishedImage=await db.query("select count(*)::int n from storage.objects where bucket_id='go-official-cards' and name='qa/displayB1'");assert.equal(publishedImage.rows[0].n,1,'Editing a copied draft must preserve the current published image');
await call('/api/admin/go/official',{action:'publish',dogId:'44444444-4444-4444-8444-444444444444',versionId:draft.versionId},admin);
passed.push('Real admin login, all five official image uploads, published original preservation and publish');
const listed=(await call('/api/admin/go/official?dogId=44444444-4444-4444-8444-444444444444',undefined,admin)).data;
assert.equal(listed.sets[0].versions[0].assets.length,5);
const signedImage=listed.sets[0].versions[0].assets[0].imageUrl;
assert.equal((await fetch(signedImage)).status,200);passed.push('Published five slots with real private signed-image download');
await call('/api/admin/go/official',{action:'pause',dogId:'44444444-4444-4444-8444-444444444444'},admin);
await call('/api/admin/go/official',{action:'resume',dogId:'44444444-4444-4444-8444-444444444444'},admin);passed.push('Admin pause and resume');
const beforeDraw=(await call('/api/go/coins',undefined,b)).data.balance;
const draw=(await call('/api/go/official',{action:'draw'},b)).data;
const redraw=(await call('/api/go/official',{action:'draw'},b)).data;assert.equal(draw.dogId,redraw.dogId);assert.equal(draw.slot,redraw.slot);assert.equal(redraw.coinsAdded,0);assert.equal((await call('/api/go/coins',undefined,b)).data.balance,beforeDraw+10);passed.push('Daily free draw HTTP retry preserves card and rewards once');
const beforeCare=(await call('/api/go/coins',undefined,a)).data.balance;
await call('/api/go/interaction',{dogId:'33333333-3333-4333-8333-333333333333',action:'snack'},a);
assert.equal((await call('/api/go/coins',undefined,a)).data.balance,beforeCare+10);passed.push('Care action and first daily care quest award 10C total');
const visitState=(await call('/api/go/visit',undefined,a)).data;
if(visitState.canRequestNow){
 const visit=(await call('/api/go/visit',{action:'request'},a)).data;
 const duplicate=(await call('/api/go/visit',{action:'request'},a)).data;assert.equal(visit.id,duplicate.id);
 const beforeVisit=(await call('/api/go/coins',undefined,a)).data.balance;
 const reviewed=await fetch(origin+'/api/admin/go/visit',{method:'PATCH',headers:{origin,host:'localhost:55436','Content-Type':'application/json',Cookie:admin},body:JSON.stringify({id:visit.id,action:'approve'})});assert.equal(reviewed.status,200,await reviewed.text());
 assert.equal((await call('/api/go/coins',undefined,a)).data.balance,beforeVisit+30);passed.push('Visit request/idempotent pending request/admin approval grants 30C over HTTP');
}else{await call('/api/go/visit',{action:'request'},a,409);passed.push('Outside-hours visit request rejected by real SQL function');}



await db.query(`INSERT INTO go_members(id,nickname,nickname_key,password_hash,recovery_hash) SELECT '99999999-9999-4999-8999-999999999999','기록가다','qauserc',password_hash,'qa-recovery' FROM go_members WHERE id='11111111-1111-4111-8111-111111111111'; INSERT INTO go_coin_wallets(member_id,balance) VALUES('99999999-9999-4999-8999-999999999999',300);`);
const third=(await call('/api/go/session',{action:'login',nickname:'qauserc',password:'qa-pass-only'})).cookie;
await call('/api/go/pvp',{action:'sync',roomId},third,409);
async function racePurchase(body){const r=await fetch(origin+'/api/go/store',{method:'POST',headers:{origin,host:'localhost:55436','Content-Type':'application/json',Cookie:third},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
const races=await Promise.all([racePurchase({mode:'specific',requestId:randomUUID(),dogId:purchase.dogId}),racePurchase({mode:'specific',requestId:randomUUID(),dogId:purchase.dogId})]);assert.deepEqual(races.map(r=>r.status).sort(),[200,409]);assert.equal((await call('/api/go/coins',undefined,third)).data.balance,0);
await db.query("UPDATE go_coin_wallets SET balance=300 WHERE member_id='99999999-9999-4999-8999-999999999999'");const concurrentId=randomUUID();const same={mode:'specific',requestId:concurrentId,dogId:purchase.dogId};const identical=await Promise.all([racePurchase(same),racePurchase(same)]);assert.deepEqual(identical.map(r=>r.status),[200,200]);assert.equal((await call('/api/go/coins',undefined,third)).data.balance,0);assert.equal((await db.query('select count(*)::int n from go_official_purchases where request_id=$1',[concurrentId])).rows[0].n,1);passed.push('Concurrent real HTTP purchases: distinct IDs cannot overspend; same ID debits once; third-member PvP denied');
const reconnect=(await call('/api/go/pvp',{action:'create'},a)).data;await call('/api/go/pvp',{action:'join',invite:reconnect.inviteCode},b);const rid=reconnect.roomId;
await call('/api/go/pvp',{action:'select',roomId:rid,kind:'camera',cardId:'55555555-5555-4555-8555-555555555555'},a);await call('/api/go/pvp',{action:'select',roomId:rid,kind:'camera',cardId:'66666666-6666-4666-8666-666666666666'},b);await call('/api/go/pvp',{action:'ready',roomId:rid},a);
await db.query("UPDATE go_pvp_rooms SET host_seen_at=now()-interval '7 seconds' WHERE id=$1",[rid]);const disconnected=(await call('/api/go/pvp',{action:'sync',roomId:rid},b)).data;assert.equal(disconnected.myReady,false);assert.equal(disconnected.otherReady,false);
await call('/api/go/pvp',{action:'sync',roomId:rid},a);await db.query("UPDATE go_pvp_rooms SET host_seen_at=now()-interval '31 seconds' WHERE id=$1",[rid]);const cancelled=(await call('/api/go/pvp',{action:'sync',roomId:rid},b)).data;assert.equal(cancelled.status,'cancelled');assert.equal((await db.query('select count(*)::int n from go_pvp_records')).rows[0].n,2);passed.push('HTTP reconnection: 7-second stale peer clears both READY; 31 seconds cancels without extra records');
console.log(JSON.stringify({passed},null,2));fs.writeFileSync(runtimeRoot+'/http-result.json',JSON.stringify({passed},null,2));await db.end();
