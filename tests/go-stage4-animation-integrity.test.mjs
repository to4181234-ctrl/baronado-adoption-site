import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const assets=[
 ['meonggo_store_loop.svg','4d2facd9fb6b58169323047b5672d8c8f6e116c7bef6676f3a92a410496726b3'],
 ['meonggo_store_still.svg','6825b3794203912c5d133c62f62e6cc6707418721c2fcfd1683cb0ed1352e162']
];
for(const [file,expected] of assets){
 test(file+' is byte-for-byte the user-provided store SVG',()=>{
  const buf=readFileSync(new URL('../public/meonggo/store/'+file,import.meta.url));
  assert.equal(createHash('sha256').update(buf).digest('hex'),expected);
  const svg=buf.toString('utf8');
  assert.match(svg,/<svg[^>]*width="390"[^>]*height="225"/);
  if(file.includes('loop'))assert.match(svg,/dur="4\.8s"/);
 });
}
