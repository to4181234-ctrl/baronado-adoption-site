import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('daily free draw is opened over quests rather than a /go redirect',()=>{
 const quests=read('components/GoQuests.js');
 assert.match(quests,/task\.id==='draw' && !compact/);
 assert.match(quests,/setDrawOpen\(true\)/);
 assert.match(quests,/<GoFreeDraw onClose=/);
 const draw=read('components/GoFreeDraw.js');
 assert.match(draw,/choice===null\|\|busy/);
 assert.match(draw,/action:'draw'/);
 assert.match(draw,/drawUsed/);
 assert.match(draw,/pendingDuplicate/);
});
test('duplicate selection requires separate confirmed choice before server resolve',()=>{
 const source=read('components/GoDuplicateCompare.js');
 assert.match(source,/기존 카드 유지하기/);
 assert.match(source,/새 카드로 교체하기/);
 assert.match(source,/정말 이 카드로 선택하시겠어요\?/);
 assert.match(source,/onResolve\(choice\)/);
 assert.match(source,/setConfirm\(false\)/);
});
test('store purchase goes directly to original result presentation when image exists',()=>{
 const source=read('components/GoStore.js');
 assert.match(source,/if\(purchased\.card\.imageUrl\)/);
 assert.match(source,/<GoOfficialDrawReveal card=\{revealed\}/);
 assert.doesNotMatch(source,/오늘의 멍카드!/);
});
test('coin history is a single full-screen ledger with balance and approved labels',()=>{
 const source=read('components/GoCoins.js');
 const api=read('app/api/go/coins/route.js');
 assert.match(source,/\['earn', '적립'\]/);
 assert.match(source,/보유 멍코인/);
 assert.match(source,/멍코인 내역/);
 assert.match(source,/ 멍코인/);
 assert.doesNotMatch(source,/go-coin-transaction-extra/);
 assert.match(api,/30 \* 86400 \* 1000/);
});

test('approved sparkle SVGs keep their own sizes rather than inheriting collar sizing',()=>{
 const reveal=read('components/GoOfficialDrawReveal.js');
 const css=read('app/figma-stage4-store.css');
 assert.match(reveal,/className="go-official-collar-image"/);
 assert.match(reveal,/className="go-official-sparkles-top"/);
 assert.match(reveal,/className="go-official-sparkles-bottom"/);
 assert.match(css,/\.go-official-reveal-collar>\.go-official-collar-image\{/);
 assert.doesNotMatch(css,/\.go-official-reveal-collar>img\{/);
 assert.match(css,/\.go-official-sparkles-top\{width:200px/);
 assert.match(css,/\.go-official-sparkles-bottom\{width:157px/);
});

test('missing purchased image does not offer a broken replay popup',()=>{
 const store=read('components/GoStore.js');
 assert.match(store,/카드는 지급되었지만 이미지를 불러오지 못했어요/);
 assert.doesNotMatch(store,/카드 연출 보기/);
 assert.doesNotMatch(store,/SKIP · 내 도감에 저장됨/);
 assert.match(store,/if\(purchased\.card\.imageUrl\)setRevealed/);
});

test('store discards previous-account catalog, reveal and duplicate on account change',()=>{
 const store=read('components/GoStore.js');
 assert.match(store,/catalogRequestRef=useRef\(0\)/);
 assert.match(store,/if\(request!==catalogRequestRef\.current\)return null/);
 assert.match(store,/setCatalog\(EMPTY\);setDuplicate\(null\);setRevealed\(null\);setConfirm\(false\)/);
 assert.match(store,/\},\[member\?\.id\]\)/);
});

test('duplicate graphics stay in their card cell despite global absolute SVG styling',()=>{
 const css=read('app/figma-stage4-store.css');
 for(const selector of ['go-duplicate-card-frame','go-duplicate-confirm-card'])assert.match(css,new RegExp(selector+'[^}]+position:relative;inset:auto'));
});
