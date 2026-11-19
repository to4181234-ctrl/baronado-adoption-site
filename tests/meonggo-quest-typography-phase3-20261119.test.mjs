import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Figma 558:466129: all quest captions use Galmuri11 Regular, 10px/15.5px and #797979',()=>{
 const css=read('app/figma-prelaunch-quests.css');
 assert.match(css,/\.v3-go-site \.go-quest-page \.go-quest-item \.go-quest-description\{\s*display:block;[^\n]*color:#797979;\s*font:400 10px\/15\.5px 'Galmuri11',sans-serif;letter-spacing:0;/);
 assert.equal((css.match(/\.go-quest-description\{/g)||[]).length,1,'only one canonical full-page caption rule');
});

test('all 4 quest captions map through one shared component class',()=>{
 const jsx=read('components/GoQuests.js');
 for(const title of ['바로나도에 놀러왔개','멍멍이 만나러가기','랜덤 멍카드 뽑기','멍배틀 하기'])assert.ok(jsx.includes(title),title);
 assert.match(jsx,/tasks\.map\(task => <article[\s\S]*?<small className="go-quest-description">\{task\.caption\}<\/small>/);
 assert.equal((jsx.match(/className="go-quest-description"/g)||[]).length,1);
});

test('remove stale 9px mobile and 11px full-page override without changing compact home quests',()=>{
 const figma=read('app/figma-prelaunch-quests.css');
 const base=read('app/meonggo-stage1.css');
 const corrections=read('app/meonggo2-pending-revisions.css');
 assert.doesNotMatch(figma,/go-quest-item small\{font-size:9px/);
 assert.doesNotMatch(figma,/go-quest-item>div:first-child>small/);
 assert.doesNotMatch(base,/^\.go-quest-item>div:first-child>small/m);
 assert.match(base,/\.go-quest-compact \.go-quest-item>div:first-child>small\{font-size:11px!important;line-height:1\.45!important;\}/);
 assert.doesNotMatch(corrections,/go-quest-page \.go-quest-item>div:first-child>small/);
 assert.match(figma,/@media\(max-width:355px\)\{\s*\.v3-go-site \.go-quest-page \.go-quest-item-action b\{font-size:11px\}\s*\}/);
});

test('completed and pending captions share font settings; only color is muted when completed',()=>{
 const figma=read('app/figma-prelaunch-quests.css');
 const base=read('app/meonggo-stage1.css');
 const jsx=read('components/GoQuests.js');
 assert.match(figma,/go-quest-item\.is-complete small\{color:#b5b5b5!important;\}/);
 assert.match(base,/go-quest-item\.is-complete small\{color:#b5b5b5!important;\}/);
 assert.doesNotMatch(figma,/is-complete small\{[^}]*font-size/);
 assert.match(jsx,/task\.completed\?'완료'/);
 assert.match(jsx,/task\.completed \? ' is-complete'/);
});

test('local Figma Galmuri11 font remains intact, with no remote font replacement',()=>{
 const font=read('app/figma-stage1-navigation.css');
 assert.match(font,/@font-face\{font-family:Galmuri11;src:url\('\/fonts\/figma\/Galmuri11-navigation\.ttf'\)/);
 assert.ok(readFileSync(new URL('../public/fonts/figma/Galmuri11-navigation.ttf',import.meta.url)).byteLength>100);
});
