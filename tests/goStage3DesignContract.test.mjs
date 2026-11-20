import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const album=read('components/GoPage.js');
const pvp=read('components/GoFriendBattle.js');
const pvpCss=read('components/GoFriendBattle.css');
const store=read('components/GoStore.js');
const cardFace=read('components/GoCardFace.js');
const reveal=read('components/GoOfficialDrawReveal.js');
const battle=read('components/GoBattle.js');
const style=read('app/meonggo2-stage3-ui.css');
const shell=read('app/layout.js');
const albumCss=read('app/figma-stage5-album.css');
const silhouette=read('public/meonggo/store/specific-dog-silhouette-figma-692-289657.svg');

test('Figma 690:289241: new free draw entry is BEFORE the coin quest entry',()=>{
 const free=album.indexOf('className="v3-home-free-shortcut v3-home-quest-shortcut"');
 const quest=album.indexOf('<div className="v3-home-quest-shortcut"><Link href="/go/quests"');
 assert.ok(free>=0&&quest>free);
 assert.match(album,/1일 2회 한정 무료/);
 assert.match(album,/member\?setFreeDrawOpen\(true\):openAccount\(\)/);
 assert.match(album,/freeDrawOpen&&<GoFreeDraw/);
});

test('Figma 692:289316: distinct product art matches dimensions, colours and price copy',()=>{
 assert.match(store,/StoreProductPreview mode="random"/);
 assert.match(store,/StoreProductPreview mode="specific"/);
 assert.match(store,/#dde9c2/);
 assert.match(store,/#fef4ba/);
 assert.match(store,/href="\/meonggo\/store\/specific-dog-silhouette-figma-692-289657.svg"/);
 assert.match(store,/랜덤 카드 뽑기/);
 assert.match(store,/지정 랜덤 카드 뽑기/);
 assert.match(store,/60 멍코인/);
 assert.match(store,/100 멍코인/);
 assert.match(style,/font:700 11px\/16\.5px/);
 assert.match(style,/166\/265/);
 assert.match(silhouette,/<svg[^>]*viewBox="0 0 58 56"/);
});

test('READY action moves before participants, colours depend on actual ready booleans',()=>{
 const action=pvp.indexOf("className=\"meong-battle-primary friend-pvp-ready-action\"");
 const participants=pvp.indexOf('className="friend-pvp-participants"');
 assert.ok(action>=0&&action<participants);
 assert.match(pvp,/room\.myReady\?'✓ 준비 완료':'준비 전'/);
 assert.match(pvp,/room\.otherReady\?'✓ 준비 완료':'준비 전'/);
 assert.match(pvp,/room\.myReady\?'is-ready':''/);
 assert.match(pvp,/room\.otherReady\?'is-ready':''/);
 assert.doesNotMatch(pvp,/room\.mySelected\?'카드 선택 완료'/);
 assert.match(style,/\.friend-pvp-ready-state span\.is-ready/);
});

test('selected card is yellow, with original black SVG frame but no gold outer rectangle',()=>{
 assert.match(pvp,/GoCardFace card=\{face\(card\)\} selected=\{selected\}/);
 assert.match(cardFace,/selected=false/);
 assert.match(cardFace,/fill="#f8dc65"/);
 assert.match(cardFace,/href=\{CARD_FACE\.frame\}/);
 assert.match(pvpCss,/:after\{content:none\}/);
 assert.match(albumCss,/background:#f8dc65!important;box-shadow:none!important/);
});

test('collar scales only the selected original image, animations are 0.7 and 0.95 sec',()=>{
 assert.match(style,/transform:scale\(1\.10\)/);
 assert.match(style,/\.go-free-draw-collars>button\[aria-pressed='true'\] img/);
 assert.match(style,/\.s4-store-original-choice \.s4-store-collars>button\[aria-pressed='true'\] img/);
 assert.match(style,/animation-duration:\.7s!important/);
 assert.match(reveal,/setTimeout\(\(\)=>setIntroFinished\(true\),950\)/);
 assert.match(style,/prefers-reduced-motion:reduce/);
});

test('battle selection no longer shows opponents card count, fight shake is scoped',()=>{
 assert.doesNotMatch(battle,/대결 가능 카드 \{m\.cardCount\}장/);
 assert.match(style,/meong-battle-app\.meong-battle-phase-fight\{overflow-x:clip\}/);
 assert.match(style,/animation:none!important;translate:none!important/);
 assert.match(style,/meong-in-card-hit-heavy/);
 assert.match(style,/\.meong-battle-card\.is-mini \.go-card-graphic/);
});

test('new stylesheet loaded last without changing original Figma files',()=>{
 assert.match(shell,/import '\.\/meonggo2-stage3-ui\.css'/);
 assert.ok(shell.lastIndexOf("meonggo2-stage3-ui.css")>shell.lastIndexOf("meonggo-admin-nav-phase1.css"));
});
