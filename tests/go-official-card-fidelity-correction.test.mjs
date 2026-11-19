import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

const paths=[
 'components/GoStage2OfficialCards.js','components/GoCardFace.js',
 'components/GoRecorder.js','app/admin/go/official/page.js',
 'app/api/go/official/route.js','app/api/go/recorders/[id]/route.js',
 'lib/goOfficial.js','app/figma-stage2-official.css',
 'app/figma-stage11-public-profile.css'
];
test('all changed JSX and JS sources parse without diagnostics',()=>{
 for(const file of paths.filter(f=>f.endsWith('.js'))){
  const source=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.includes('/page')||file.includes('components/')?ts.ScriptKind.JSX:ts.ScriptKind.JS);
  assert.equal(source.parseDiagnostics.length,0,`${file}: ${source.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join(', ')}`);
 }
});
test('admin accepts titles for all five official slots and validates the special title',()=>{
 const page=read('app/admin/go/official/page.js'),settings=read('lib/goOfficial.js');
 assert.match(page,/\{<label>카드별 제목 \(최대 30자\)/);
 assert.match(page,/if\(!options\.title\?\.trim\(\)/);
 assert.match(page,/HIDDEN 이미지와 제목을 임시 저장했어요/);
 assert.match(settings,/HIDDEN 카드 제목은 1~30자로 입력해주세요/);
 assert.doesNotMatch(settings,/s!==5 &&/);
});
test('official API returns only unlocked HIDDEN title; no pre-unlock leak',()=>{
 const api=read('app/api/go/official/route.js');
 assert.match(api,/title:special\?photoMap\.get\(s\.dog_id\+':5'\)\?\.title/);
 assert.match(api,/if\(asset\.slot===5\?hiddenKeys\.has/);
 const publicApi=read('app/api/go/recorders/[id]/route.js');
 assert.match(publicApi,/slot:5,hidden:true,owned:special,title:special\?/);
});
test('NO.1–5 share the pixel frame and visible number while HIDDEN has no fake 0 rating',()=>{
 const album=read('components/GoStage2OfficialCards.js'),face=read('components/GoCardFace.js');
 assert.match(album,/GoCardFace card=\{officialFace\(HIDDEN_SLOT,hidden\)\}/);
 assert.match(album,/GoAlbumCardDetail official/);
 assert.match(album,/card=\{\{\.\.\.officialFace\(opened\.slot,openedData\)/);
 assert.match(album,/unknownScores:slot===HIDDEN_SLOT/);
 assert.doesNotMatch(album,/hiddenJustUnlocked&&<p>/);
 assert.doesNotMatch(album,/power:0,charm:0/);
 assert.match(face,/NO\.\$\{card\.officialSlot\}/);
 assert.match(face,/missingScores\?5:value/);
 assert.match(face,/<title>\{title\}<\/title>/);
 assert.match(face,/href=\{CARD_FACE\.frame\}/);
});
test('missing owned images are not misrepresented as unlocked cards',()=>{
 const album=read('components/GoStage2OfficialCards.js');
 assert.match(album,/s2-official-unavailable/);
 assert.match(album,/NO\.\{card\.slot\} 카드 이미지를 불러오지 못했어요/);
 assert.match(album,/HIDDEN 이미지를 불러오지 못했어요/);
});
test('approved hidden locked/pixel style is reused in private and public albums',()=>{
 const album=read('components/GoStage2OfficialCards.js');
 const css=read('app/figma-stage2-official.css');
 const publicComponent=read('components/GoRecorder.js');
 assert.match(album,/figma-official\/hidden-pixel-bg\.png/);
 assert.match(album,/4종 모두 모으면 해금/);
 assert.ok(existsSync(new URL('../public/figma-official/hidden-pixel-bg.png',import.meta.url)));
 assert.match(css,/\.s2-official-hidden\.is-unlockable\{outline:none/);
 assert.match(css,/s2-official-viewer-card>\.go-card-graphic/);
 assert.doesNotMatch(publicComponent,/if\(card\.slot===5\)return <img/);
 assert.match(publicComponent,/title:card\.title,unknownScores:card\.slot===5/);
 assert.match(publicComponent,/s4-public-card-title/);
});
test('card title visible in personal album and official popup',()=>{
 const album=read('components/GoStage2OfficialCards.js');
 assert.match(album,/s2-official-card-caption/);
 assert.match(album,/card\?\.title/);
 assert.match(read('components/GoAlbumCardDetail.js'),/card\.title\|\|card\.dogName/);
 assert.match(album,/card\.title/);
});

test('free and paid collar selections keep state without invented outline',()=>{
 const css=read('app/figma-stage4-store.css');
 assert.match(css,/\.go-free-draw-collars button\[aria-pressed="true"\],[\s\S]*?outline:none!important/);
 assert.match(css,/\.s4-store-original-choice \.s4-store-collars>button\[aria-pressed="true"\]/);
 assert.match(css,/button:focus-visible/);
});
