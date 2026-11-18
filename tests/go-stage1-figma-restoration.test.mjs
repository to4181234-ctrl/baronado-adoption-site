import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const store = read('components/GoStore.js');
const home = read('components/GoPage.js');
const css = read('app/figma-stage4-store.css');

// Structural regression tests. These are not a substitute for rendered Figma comparison.
test('store uses only two original on-page product entry points', () => {
  assert.match(store, /카드 랜덤 뽑기/);
  assert.match(store, /카드 지정 랜덤 뽑기/);
  assert.match(store, /setChoiceOpen\(true\)/);
  assert.match(store, /setDogPickerOpen\(true\)/);
  assert.doesNotMatch(store, /움직임 멈추기|움직임 재생|s4-store-draw\b|s4-store-wallet\b|s4-store-buy\b/);
});

test('store keeps original pixel collar-selection assets and choices', () => {
  assert.match(store, /className="s4-store-original-choice"/);
  assert.match(store, /figma-v3\/collar\.png/);
  assert.match(store, /figma-v3\/discovery-dialog-bg\.svg/);
  assert.match(store, /figma-v3\/discovery-dialog-outer\.svg/);
  assert.match(store, /figma-v3\/discovery-dialog-inner\.svg/);
  assert.match(store, /하나 고른다/);
  assert.match(store, /도망간다/);
  assert.match(css, /width:min\(345px,calc\(100vw - 24px\)\)/);
  assert.match(css, /height:min\(502px,calc\(100dvh - 24px\)\)/);
});

test('home keeps Figma quest shortcut without embedded full quest widget', () => {
  assert.match(home, /v3-home-quest-shortcut/);
  assert.match(home, /href="\/go\/quests"/);
  assert.doesNotMatch(home, /<GoQuests\b/);
});

test('store selection border is not shown in product tile CSS', () => {
  assert.match(css, /\.v3-go-site \.s4-store-choices>button\s*,\s*\.v3-go-site \.s4-store-choices>button\[aria-pressed="true"\]\s*\{/);
  assert.match(css, /border:0!important/);
  assert.match(css, /\.s4-store-choices button:focus-visible\{outline:2px/);
});


test('initial pixel action retains full-strength Figma arrow while its click remains disabled', () => {
  assert.match(store, /initial disabled=\{collarChoice===null\}/);
  assert.match(css, /\.s4-store-original-choice \.s4-store-collar-actions \.v3-pixel-choice:disabled\{opacity:1\}/);
});

test('approved collar popup is anchored at Figma y=96 on 390px artboard', () => {
  assert.match(css, /s4-store-overlay:has\(>\.s4-store-original-choice\)\{align-items:flex-start;padding-top:96px/);
  assert.match(css, /max-height:620px/);
});

test('store reuses the original unboxed discovery pixel choice appearance', () => {
  assert.match(css, /s4-store-original-choice \.s4-store-collar-actions \.v3-pixel-choice\{\s*display:flex;align-items:center;gap:8px/);
  assert.match(css, /padding:0!important;background:none;border:0;text-align:left/);
});


test('store-only preview keeps full-opacity grayscale stars without changing album locked cards', () => {
  const card = read('components/GoStage2OfficialCards.js');
  assert.match(store, /<LockedOfficialCard slot=\{1\} storePreview\/>/);
  assert.match(card, /storePreview\?\{filter:'grayscale\(1\)'\}:\{filter:'grayscale\(1\)',opacity:\.?65\}/);
});

test('purchase confirmation matches approved Figma prompt and button order', () => {
  assert.match(store, /s4-store-original-confirm/);
  assert.match(store, /멍코인을 사용하여<br\/>구매하시겠습니까\?/);
  const answers = store.slice(store.indexOf('className="s4-store-confirm-answers"'));
  assert.ok(answers.indexOf("onClick={buy}") < answers.indexOf('onClick={()=>setConfirm(false)}'));
  assert.doesNotMatch(store, /정말 구매할까요\?|‘네’를 누르면 코인이 차감되고 카드가 지급돼요/);
  assert.match(css, /height:169px/);
  assert.match(css, /width:min\(331px,calc\(100vw - 24px\)\)/);
});

test('320px two product columns shrink without horizontal overflow', () => {
  assert.match(css, /@media\(max-width:389px\)\{\s*\.v3-go-site \.s4-store-choices\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
