import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const file = name => fs.readFileSync(path.join(root,name),'utf8');

test('free draw opens on user click from album, not quest',()=>{
 const home=file('components/GoPage.js');
 const quests=file('components/GoQuests.js');
 assert.doesNotMatch(home,/<GoDiscovery\b/);
 assert.match(home,/member\?setFreeDrawOpen\(true\):openAccount\(\)/);
 assert.match(home,/freeDrawOpen&&<GoFreeDraw/);
 assert.doesNotMatch(quests,/id: 'draw'/);
});

test('all completed quests have non-clickable text, before any button branch',()=>{
 const s=file('components/GoQuests.js');
 assert.match(s,/\{task\.completed\s*\? <span className="go-quest-title is-complete" aria-disabled="true">/);
 assert.doesNotMatch(s,/task\.completed\s*\?\s*<button/);
 assert.match(s,/fetch\('\/api\/go\/quests\/care-target'/);
 assert.match(s,/router\.push\('\/go\/interact\/'/);
 assert.match(file('app/api/go/quests/care-target/route.js'), /Number\(x.level\)/);
});
test('employee code is in its own space above the visit countdown',()=>{
 const c=file('app/figma-prelaunch-quests.css');
 assert.match(c,/\.go-visit-dialog-code\{\s*position:absolute;top:231px/);
 assert.match(c,/has\(\.go-visit-dialog-code\) \.go-visit-dialog-status\[role=timer\]\{top:254px\}/);
});
test('all quest titles and reward amounts use Figma-sized common text',()=>{
 const c=file('app/figma-prelaunch-quests.css');
 assert.match(c,/\.go-quest-page \.go-quest-title\{[\s\S]*?font:700 13px\/19\.5px MonaS12/);
 assert.match(c,/\.go-quest-page \.go-quest-item-action b\{[\s\S]*?font:700 13px\/19\.5px MonaS12/);
 assert.match(file('components/GoQuests.js'),/id: 'care', title: '멍멍이 만나러가기', coins: 10/);
 assert.match(file('components/GoQuests.js'),/id: 'visit', title: '바로나도에 놀러왔개', coins: 30/);
});
test('coin feedback is beside the existing wallet for 1.5 seconds, not a floating banner',()=>{
 const coins=file('components/GoCoins.js');
 const header=file('components/SiteHeader.js');
 const css=file('app/meonggo-stage1.css');
 assert.doesNotMatch(coins,/className="go-coin-notice"/);
 assert.match(header,/s3-coin-feedback/);
 assert.match(css,/\.s1-header-actions \.s3-coin-feedback/);
 assert.match(file('lib/goCoinNotices.js'),/setTimeout\(next, 1500\)/);
});
test('isolated DB draft excludes care reward from first 10C quest',()=>{
 const sql=file('docs/sql/quest-care-10-total-DRAFT.sql');
 assert.match(sql,/v_quest_awarded := 10/);
 assert.match(sql,/IF v_quest_awarded = 0 THEN/);
 assert.match(sql,/v_care_awarded := 10/);
 assert.match(sql,/go_interactions/);
 assert.match(sql,/-- Do NOT apply to production/);
 const setup=file('tests/http-qa/setup.mjs');
 assert.match(setup,/quest-care-10-total-DRAFT.sql/);
});
