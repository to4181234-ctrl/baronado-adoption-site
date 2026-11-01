import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync,statSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const stagedRoot=resolve(root,'..');
const baseline=new Set([
 'lib/server/adminData.js','lib/server/goAuth.js','lib/server/goCollection.js',
 'lib/server/adminSession.js','lib/server/adminHttp.js','lib/goBulkDelete.js',
 'lib/server/goCards.js','components/AdminGuard.js','components/SiteHeader.js',
 'lib/dogs.js','lib/dogProfile.js'
]);
function walk(folder){return readdirSync(folder,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(resolve(folder,x.name)):[resolve(folder,x.name)]);}
test('every previous correction patch is retained intact',()=>{
 for(let n=1;n<=6;n++){
  const files=readdirSync(resolve(stagedRoot,'existing-stages')).filter(f=>f.startsWith(String(n).padStart(2,'0')+'-')&&f.endsWith('.patch'));
  assert.equal(files.length,1,`Missing stage ${n}`);
  assert.ok(statSync(resolve(stagedRoot,'existing-stages',files[0])).size>100);
 }
});
test('staged relative source imports resolve to staged files or verified baseline paths',()=>{
 const missing=[];
 for(const file of walk(root).filter(f=>/\.(js|mjs)$/.test(f))){
  const code=readFileSync(file,'utf8');
  for(const match of code.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){
   const target=resolve(dirname(file),match[1]);
   const candidates=[target,target+'.js',target+'.mjs'];
   if(candidates.some(existsSync))continue;
   const expected=relative(root,target).replaceAll('\\','/');
   if(!baseline.has(expected))missing.push(`${relative(root,file)} -> ${match[1]} (${expected})`);
  }
 }
 assert.deepEqual(missing,[]);
});
test('database migrations are separate staged files, not an automatic operation',()=>{
 for(const filename of ['20261101_site_banners_staged.sql','20261101_go_reports_staged.sql','20261101_go_last_card_staged.sql']){
  const p=resolve(root,'supabase/migrations',filename);
  assert.ok(existsSync(p));
  assert.match(readFileSync(p,'utf8'),/STAGED ONLY/);
 }
});
