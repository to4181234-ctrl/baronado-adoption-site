import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const src=name=>readFileSync(new URL(`../components/${name}`,import.meta.url),'utf8');

test('draw, purchase, comparison, and reveal use live sound controls rather than decorative audio images',()=>{
 for(const name of ['GoFreeDraw.js','GoStore.js','GoDuplicateCompare.js','GoOfficialDrawReveal.js']){
  const code=src(name);
  assert.match(code,/import GoSoundToggle from '\.\/GoSoundToggle\.js'/,name);
  assert.match(code,/<GoSoundToggle className=/,name);
  assert.doesNotMatch(code,/<img className="(?:go-free-draw-sound|go-duplicate-sound|go-official-reveal-sound|s4-store-sound-icon)"/,name);
 }
});

test('sound control toggles the shared persisted setting and announces its state',()=>{
 const code=src('GoSoundToggle.js');
 assert.match(code,/listenAudioSetting\(setEnabled\)/);
 assert.match(code,/localStorage\.setItem\(GAME_SOUND_KEY/);
 assert.match(code,/notifyAudioSettingChanged\(\)/);
 assert.match(code,/aria-pressed=\{enabled\}/);
 assert.match(code,/sound-\$\{enabled\?'on':'off'\}/);
});

test('approved collar-select sounds honor global audio setting for free and purchased draws',()=>{
 for(const name of ['GoFreeDraw.js','GoStore.js']){
  const code=src(name);
  assert.match(code,/createGameAudio\(\)/,name);
  assert.match(code,/sound\.current\?\.play\('collar'\)/,name);
  assert.match(code,/sound\.current\?\.dispose\(\)/,name);
 }
});
