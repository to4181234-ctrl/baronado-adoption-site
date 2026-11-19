import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('admin starts in visit certification while legacy menu/category links remain working',()=>{
 const home=read('app/admin/page.js'),legacy=read('app/admin/menu/page.js');
 assert.match(home,/redirect\('\/admin\/go\/visit'\)/);
 assert.match(legacy,/redirect\('\/admin\/dogs\?category='/);
 assert.match(legacy,/params\?\.category==='resident'/);
});

test('admin has two path-selected management areas with exclusive child menu lists',()=>{
 const header=read('components/SiteHeader.js');
 assert.match(header,/v10-admin-group-switch/);
 assert.match(header,/관리 영역 선택/);
 assert.match(header,/멍멍GO 관리/);
 assert.match(header,/바로나도 홈 관리/);
 assert.match(header,/adminInGo\?\[/);
 assert.match(header,/adminMenus\.map/);
 assert.match(header,/pathname\.startsWith\('\/admin\/go'\)/);
 for(const url of ['/admin/go/visit','/admin/go','/admin/go/official','/admin/go/pixels','/admin/go/stats'])
  assert.ok(header.includes(url),url);
 for(const url of ['/admin/dogs?category=adoption','/admin/banners','/admin/analytics'])
  assert.ok(header.includes(url),url);
 assert.doesNotMatch(header,/\['\/admin\/menu','관리 메뉴'\]/);
});

test('adoption and resident dog editors share one canonical screen with own category controls',()=>{
 const page=read('app/admin/dogs/page.js');
 assert.match(page,/v10-admin-dog-category/);
 assert.match(page,/강아지 정보 분류/);
 assert.match(page,/\/admin\/dogs\?category=resident/);
 assert.doesNotMatch(page,/v3-admin-chooser/);
});

test('dedicated authenticated statistics page reuses existing MeongGO data and original controls',()=>{
 const page=read('app/admin/go/stats/page.js'),original=read('components/GoAdminStats.js');
 assert.match(page,/AdminGuard/);
 assert.match(page,/SiteHeader/);
 assert.match(page,/GoAdminStats/);
 assert.match(original,/\/api\/admin\/go\/stats/);
 for(const label of ['전체 게시물','공개 게시물','비공개 게시물','좋아요 합계','멍멍이별 게시물 수','좋아요가 많은 게시물'])
  assert.ok(original.includes(label),label);
});

test('home analytics still calls the separate visitor statistics API with no duplicate global tabs',()=>{
 const analytics=read('app/admin/analytics/page.js');
 assert.match(analytics,/\/api\/admin\/analytics/);
 assert.match(analytics,/홈페이지 통계/);
 assert.doesNotMatch(analytics,/className="admin-tabs"/);
 assert.doesNotMatch(analytics,/className="back-link"/);
 const css=read('app/meonggo-admin-nav-phase1.css');
 assert.match(css,/v10-admin-group-switch/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test('route smoke checks both old visit entry and new statistics entry without mutating operations',()=>{
 const smoke=read('scripts/verify-go-http-smoke.sh');
 assert.match(smoke,/\/admin\/go\/stats/);
 assert.match(smoke,/\/admin\/go\/visit/);
 assert.match(smoke,/Read-only HTTP smoke/);
});
