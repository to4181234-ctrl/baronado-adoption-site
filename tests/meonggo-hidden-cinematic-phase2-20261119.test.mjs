import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
import {HIDDEN_PARTICLE_COUNTS,HIDDEN_PARTICLE_TOTAL,HIDDEN_PIXEL_PARTICLES,HIDDEN_PIXEL_SPRITES} from '../lib/goHiddenPixelParticles.js';

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
 for(const className of ['go-hidden-aura','go-hidden-pulse','go-hidden-flash','go-album-hidden-burst','go-album-hologram'])
  assert.ok(src.includes(className),className);
 assert.match(src,/HIDDEN_PIXEL_PARTICLES\.map/);
 assert.match(src,/HIDDEN_PIXEL_SPRITES\[particle.type\]/);
 for(const key of ['go-hidden-card-entry','go-hidden-aura-bloom','go-hidden-pulse-ring','go-hidden-holo-primary','go-hidden-center-flash','go-hidden-pixel-fly','go-hidden-holo-idle'])
  assert.match(css,new RegExp('@keyframes '+key+'\\b'),key);
 assert.match(css,/go-hidden-holo-idle 6\.5s ease-in-out 2\.15s infinite/);
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

test('user-approved B45/C35/A20 blend is exactly 18 diamonds, 14 colored stars, 8 crosses',()=>{
 assert.equal(HIDDEN_PARTICLE_TOTAL,40);
 assert.deepEqual(HIDDEN_PARTICLE_COUNTS,{diamond:18,color:14,cross:8});
 const count=HIDDEN_PIXEL_PARTICLES.reduce((r,p)=>(r[p.type]++,r),{diamond:0,color:0,cross:0});
 assert.deepEqual(count,HIDDEN_PARTICLE_COUNTS);
 assert.equal(new Set(HIDDEN_PIXEL_PARTICLES.map(p=>p.angle)).size,40);
 for(const p of HIDDEN_PIXEL_PARTICLES){
  assert.match(p.delay,/^\d+ms$/);
  assert.match(p.distance,/^\d+px$/);
  assert.match(p.size,/^\d+px$/);
  assert.equal(p.colors.length,3);
 }
});

test('particle pixels are integer-grid crisp shapes, not blurred vector circles',()=>{
 const component=read('components/GoAlbumCardDetail.js');
 const css=read('components/GoAlbumCardDetail.css');
 for(const kind of ['diamond','color','cross']){
  const shape=HIDDEN_PIXEL_SPRITES[kind];
  assert.equal(shape.length,3);
  assert.ok(shape.every(v=>v.length>0));
  for(const path of shape){
   assert.match(path,/^M\d+ \d+h1v1h-1Z/);
   assert.doesNotMatch(path,/[CLQA]/,'must be one-pixel rects without curves');
  }
 }
 assert.match(component,/HIDDEN_PIXEL_PARTICLES\.map/);
 assert.match(component,/HIDDEN_PIXEL_SPRITES\[particle.type\]/);
 assert.match(component,/shapeRendering="crispEdges"/);
 assert.match(component,/data-particle-style="pixel-mix-b45-c35-a20"/);
 assert.match(css,/shape-rendering:crispEdges/);
 assert.match(css,/image-rendering:pixelated/);
 assert.match(css,/go-hidden-pixel-fly-v3/);
 assert.doesNotMatch(component,/Array\.from\(\{length:28\}/);
 assert.doesNotMatch(css,/radial-gradient\([^\n]*\.go-album-hidden-burst/);
});
