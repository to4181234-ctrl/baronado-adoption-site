import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync,statSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const stagedRoot=resolve(root,'..');
const hasStagePatches=existsSync(resolve(stagedRoot,'existing-stages'));
const skippedFolders=new Set(['node_modules','.git','.next','public','assets','coverage','dist','build']);
const baseline=new Set([
 'lib/server/adminData.js','lib/server/goAuth.js','lib/server/goCollection.js',
 'lib/server/adminSession.js','lib/server/adminHttp.js','lib/goBulkDelete.js',
 'lib/server/goCards.js','components/AdminGuard.js','components/SiteHeader.js',
 'lib/dogs.js','lib/dogProfile.js'
]);
function walk(folder){return readdirSync(folder,{withFileTypes:true}).flatMap(x=>x.isDirectory()?(skippedFolders.has(x.name)?[]:walk(resolve(folder,x.name))):[resolve(folder,x.name)]);}
test('previous patches are preserved in staging or their output exists in integrated source',()=>{
 if(hasStagePatches){
  for(let n=1;n<=6;n++){
   const files=readdirSync(resolve(stagedRoot,'existing-stages')).filter(f=>f.startsWith(String(n).padStart(2,'0')+'-')&&f.endsWith('.patch'));
   assert.equal(files.length,1,`Missing stage ${n}`);
   assert.ok(statSync(resolve(stagedRoot,'existing-stages',files[0])).size>100);
  }
 }else{
  for(const path of ['lib/goCameraGuide.mjs','components/GoBattleStanding.js','app/api/admin/banners/route.js']){
   assert.ok(existsSync(resolve(root,path)),`Integrated code is missing: ${path}`);
  }
 }
});
test('staged relative source imports resolve to staged files or verified baseline paths',()=>{
 const missing=[];
 for(const file of walk(root).filter(f=>/\.(js|mjs)$/.test(f))){
  const code=readFileSync(file,'utf8');
  for(const match of code.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){
   const target=resolve(dirname(file),match[1]);
   const candidates=[target,target+'.js',target+'.mjs',target+'.cjs',target+'.jsx',target+'.tsx',resolve(target,'index.js'),resolve(target,'index.mjs')];
   if(candidates.some(existsSync))continue;
   const expected=relative(root,target).replaceAll('\\','/');
   if(!hasStagePatches||!baseline.has(expected))missing.push(`${relative(root,file)} -> ${match[1]} (${expected})`);
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
