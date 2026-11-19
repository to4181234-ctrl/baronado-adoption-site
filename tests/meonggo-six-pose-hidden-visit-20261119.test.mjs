import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {GO_PIXEL_IMAGE_FIELDS,GO_PIXEL_REQUIRED_KINDS,GO_PIXEL_POSES,missingGoPixelImages,hasAllGoPixelImages} from '../lib/goPixelAssets.js';
import {FIGMA_DOGS,figmaSprite} from '../lib/goV3Game.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('six distinct mandatory sprites and no action fallback',()=>{
 assert.deepEqual(GO_PIXEL_REQUIRED_KINDS,['thumbnail','front','side','feed','praise','play']);
 const values=Object.fromEntries(Object.values(GO_PIXEL_IMAGE_FIELDS).map(p=>[p,p+'.png']));
 assert.equal(hasAllGoPixelImages(values),true);
 for(const kind of GO_PIXEL_REQUIRED_KINDS)assert.deepEqual(missingGoPixelImages({...values,[GO_PIXEL_IMAGE_FIELDS[kind]]:''}),[kind]);
 const interact=read('components/GoInteract.js');
 assert.ok(interact.includes('release.poseUrls?.[pose]'));
 assert.equal(interact.includes('figmaSprite('),false);
});

test('all original Figma dogs have all five pose assets',()=>{
 for(const dog of FIGMA_DOGS)for(const pose of GO_PIXEL_POSES)
  assert.ok(existsSync(new URL('../public'+figmaSprite(dog,pose),import.meta.url)),dog+' '+pose);
});

test('administrator and backend require all image roles',()=>{
 const page=read('app/admin/go/pixels/page.js'),api=read('app/api/admin/go/pixels/route.js');
 const release=read('lib/server/goDogRelease.js'),assets=read('app/api/go/dogs/assets/route.js');
 assert.ok(page.includes('PIXEL_IMAGE_FIELDS.map'));
 assert.ok(page.includes('dog.missingKinds'));
 assert.ok(api.includes('GO_PIXEL_REQUIRED_KINDS.some'));
 assert.ok(release.includes('hasAllGoPixelImages'));
 assert.ok(assets.includes('const poseUrls='));
});

test('migration is idempotent, original-only and history preserving',()=>{
 const sql=read('docs/sql/meonggo-six-pixel-poses-20261119-DRAFT.sql');
 for(const name of FIGMA_DOGS)assert.ok(sql.includes(name));
 for(const pose of GO_PIXEL_POSES)assert.ok(sql.includes(pose+'_path'));
 assert.ok(sql.includes('px.legacy_existing'));
 assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.go_dog_release_ready'));
 assert.equal(sql.includes('DELETE FROM'),false);
 assert.ok(read('scripts/verify-go-integration-local.sh').includes('meonggo-six-pixel-poses-20261119-DRAFT.sql'));
});

test('rejected visit text flows vertically and other states keep Figma coordinates',()=>{
 const jsx=read('components/GoVisitPanel.js'),css=read('app/figma-prelaunch-quests.css');
 assert.ok(jsx.includes('go-visit-dialog-rejection-reason'));
 assert.ok(jsx.includes("item?.status==='rejected'?' is-rejected'"));
 assert.ok(css.includes('.go-visit-dialog-content.is-rejected{'));
 assert.ok(css.includes('display:flex;flex-direction:column'));
 assert.ok(css.includes('position:absolute;top:251px'));
});

test('HIDDEN matches default entrance, uses classic pixels and loops only initial beam',()=>{
 const css=read('components/GoAlbumCardDetail.css'),jsx=read('components/GoAlbumCardDetail.js');
 assert.ok(css.includes('animation:go-cinematic-reveal 1s cubic-bezier(.16,.8,.23,1) both'));
 assert.ok(css.includes('clip-path:polygon(38% 0,62% 0'));
 assert.ok(css.includes('go-hidden-holo-primary 5.8s ease-in-out 0s infinite'));
 assert.ok(css.includes('go-album-hologram::after{animation:none;opacity:0}'));
 assert.ok(jsx.includes('setIdle(true)'));
});
