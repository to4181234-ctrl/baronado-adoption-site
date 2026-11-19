import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('first unlock and every repeat use one identical HIDDEN reveal sequence',()=>{
 const detail=read('components/GoAlbumCardDetail.js');
 const catalog=read('components/GoStage2OfficialCards.js');
 const css=read('components/GoAlbumCardDetail.css');
 assert.match(catalog,/hiddenJustUnlocked&&hiddenImage&&<GoAlbumCardDetail official firstUnlock/);
 assert.match(catalog,/opened&&openedData\?\.imageUrl&&!hiddenJustUnlocked&&<GoAlbumCardDetail official preparedSound/);
 assert.match(detail,/data-hidden-sequence=\{isHidden\?'hologram-reveal-v2':undefined\}/);
 assert.match(detail,/data-hidden-sequence/);
 // No visual class depends on firstUnlock. Only the haptic timer may.
 assert.doesNotMatch(detail,/is-first-unlock/);
 assert.doesNotMatch(css,/is-first-unlock|go-hidden-holo-first/);
 assert.match(css,/\.go-album-reveal\.is-hidden \.go-album-detail-card/);
 assert.match(css,/go-hidden-holo-primary/);
});

test('HIDDEN first acquisition keeps a unique opt-in haptic; reopening does not vibrate',()=>{
 const detail=read('components/GoAlbumCardDetail.js');
 const haptics=read('lib/goBattleHaptics.js');
 assert.match(detail,/firstUnlock&&isHidden\?setTimeout\(\(\)=>vibrateHiddenUnlock\(\),1050\):null/);
 assert.match(haptics,/battleVibrationEnabled\(\)/);
 assert.match(haptics,/navigator\.vibrate\(\[44,28,82\]\)/);
 assert.match(detail,/clearTimeout\(timer\)/);
});

test('both opening and manual replay restart the same animation and approved sound cue',()=>{
 const detail=read('components/GoAlbumCardDetail.js');
 assert.match(detail,/function replay\(\)\{setReveal\(x=>x\+1\)/);
 assert.match(detail,/key=\{reveal\}/);
 assert.match(detail,/onClick=\{replay\}/);
 assert.match(detail,/preparedSound\|\|createCompletionSound\(\)/);
 assert.match(detail,/COMPLETION_SOUND_KEY/);
 assert.match(detail,/GoSoundButton enabled=\{!muted\}/);
});

test('hologram is visible on immediate opening, has pixel burst, and settles to a quiet looping shine',()=>{
 const src=read('components/GoAlbumCardDetail.js');
 const css=read('components/GoAlbumCardDetail.css');
 for(const className of ['go-hidden-aura','go-hidden-pulse','go-hidden-flash','go-album-hologram'])
  assert.ok(src.includes(className),className);
 assert.match(read('components/GoHiddenRetroBurst.js'),/className="go-album-hidden-burst"/);
 assert.match(src,/GoHiddenRetroBurst/);
 assert.match(read('components/GoHiddenRetroBurst.js'),/Array\.from\(\{length:28\}/);
 for(const key of ['go-hidden-aura-bloom','go-hidden-pulse-ring','go-hidden-holo-primary','go-hidden-center-flash','go-hidden-pixel-fly','go-hidden-holo-idle'])
  assert.match(css,new RegExp('@keyframes '+key+'\\b'),key);
 assert.match(css,/go-hidden-holo-primary 5\.8s ease-in-out 0s infinite/);
 assert.match(css,/animation:go-cinematic-reveal 1s cubic-bezier\(\.16,\.8,\.23,1\) both/);
 assert.match(css,/go-album-hidden-burst i:nth-child\(4n\)/);
 assert.match(read('components/GoHiddenRetroBurst.js'),/viewBox="0 0 17 17"/);
 assert.match(css,/transform:rotate\(var\(--ray-inverse\)\)/);
 assert.match(src,/isHidden&&idle\?' is-idle':'/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/animation:none!important/);
});

test('HIDDEN artwork and main card geometry remain original, no production DB writes',()=>{
 const src=read('components/GoAlbumCardDetail.js');
 const css=read('components/GoAlbumCardDetail.css');
 assert.match(src,/<GoCardFace card=\{card\}\/>/);
 assert.match(css,/\.go-album-detail-card\{width:196px;height:313px/);
 assert.match(src,/createPortal\(/);
 assert.doesNotMatch(src,/fetch\(|supabase|INSERT INTO|UPDATE public\./i);
});

test('JSX parses without errors and only supported CSS controls own the animation',()=>{
 for(const file of ['components/GoAlbumCardDetail.js','components/GoStage2OfficialCards.js']){
  const source=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);
  assert.deepEqual(source.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[]);
 }
});
