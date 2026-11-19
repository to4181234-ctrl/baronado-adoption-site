import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {approvedStaticPixelUrl,pixelImageUrls} from '../lib/server/goPixelUrls.js';
import {FIGMA_DOGS} from '../lib/goV3Game.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('historical cards stay viewable in both own album and public archive despite incomplete publication',()=>{
 const cards=read('lib/server/goCards.js'),collection=read('lib/server/goCollection.js');
 assert.doesNotMatch(cards,/request=request.in\('dog_id'/);
 assert.match(cards,/Historical records must remain accessible/);
 assert.match(collection,/countResult.data.map/);
 assert.doesNotMatch(collection,/countResult.data.filter\(row=>published.has/);
});
test('administrator retains visit landing and navigation to every management area',()=>{
 const home=read('app/admin/page.js'),header=read('components/SiteHeader.js'),css=read('app/figma-stage10-final.css');
 assert.match(home,/redirect\('\/admin\/go\/visit'\)/);
 for(const link of ['/admin/go/visit','/admin/dogs?category=adoption','/admin/go','/admin/go/official','/admin/go/pixels','/admin/banners','/admin/analytics'])assert.ok(header.includes(link),link);
 assert.match(css,/v10-admin-global-nav/);
});
test('existing approved Figma pixel assets exist for all original five dogs',()=>{
 const keys=['kangji','buddy','pposil','gureum','oreo'];
 assert.equal(FIGMA_DOGS.length,5);
 for(const key of keys){
  const care='/figma-v3/'+key+'-side.png',thumbnail='/figma-preview/dog-'+key+'.png';
  assert.ok(existsSync(new URL('../public'+care,import.meta.url)),care);
  assert.ok(existsSync(new URL('../public'+thumbnail,import.meta.url)),thumbnail);
  assert.equal(approvedStaticPixelUrl(care),care);
  assert.equal(approvedStaticPixelUrl(thumbnail),thumbnail);
 }
});
test('static pixel path validation rejects unapproved and external URLs',()=>{
 for(const path of ['https://test.example/x.png','/figma-v3/malicious.png','/figma-preview/dog-oreoXpng','/figma-v3/../../etc/passwd','/figma-preview/dog-oreo.png?query=1','javascript:alert(1)'])assert.equal(approvedStaticPixelUrl(path),null);
});
test('pixel URL mapper uses static original images without signing them and private uploads still signed',async()=>{
 const signed=[];const db={storage:{from:()=>({createSignedUrls:async(paths)=>{signed.push(paths);return {error:null,data:paths.map(s=>({signedUrl:'https://example.test/'+s}))}}})}};
 const map=await pixelImageUrls(db,'go-official-cards',['/figma-preview/dog-oreo.png','uploaded/private.png']);
 assert.equal(map.get('/figma-preview/dog-oreo.png'),'/figma-preview/dog-oreo.png');
 assert.equal(map.get('uploaded/private.png'),'https://example.test/uploaded/private.png');
 assert.deepEqual(signed,[['uploaded/private.png']]);
});
test('SQL seed keeps history, only links original sprites and leaves new dogs subject to full validation',()=>{
 const sql=read('docs/sql/meonggo-recovery-original-sprites-20261119-DRAFT.sql');
 for(const key of ['kangji','buddy','pposil','gureum','oreo'])assert.match(sql,new RegExp(key));
 assert.match(sql,/ON CONFLICT\(dog_id\) DO UPDATE/);
 assert.match(sql,/px.legacy_existing/);
 assert.doesNotMatch(sql,/DELETE FROM public.go_cards/);
 assert.doesNotMatch(sql,/UPDATE public.go_coin_wallets/);
 const script=read('scripts/verify-go-integration-local.sh');assert.match(script,/go-recovery-legacy-assert.sql/);
});

test('existing dog care sprite switches between front, walking, snack, praise and play poses',()=>{
 const code=read('components/GoInteract.js');
 assert.match(code,/release\?\.careUrl\?\.startsWith\('\/figma-v3\/'\)/);
 assert.match(code,/figmaSprite\(dog.name,pose\)/);
});

test('official catalog trusts the common release checker for legacy Oreo and does not hide it for empty original title',()=>{
 const code=read('app/api/go/official/route.js');
 assert.match(code,/completeSets=eligibleSets.filter\(set=>released.has\(set.dog_id\)\)/);
 assert.doesNotMatch(code,/a\.title\?\.trim\(\)\&\&a\.display_path/);
});
