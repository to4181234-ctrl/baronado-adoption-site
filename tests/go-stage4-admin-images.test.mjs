import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {officialPhotoOptions,officialPhotoOutput,officialStoragePaths} from '../lib/goOfficial.js';

test('four ordinary card images use 536x528 WebP crop, HIDDEN uses PNG',async()=>{
 const input=await sharp({create:{width:900,height:850,channels:4,background:'#eeccee'}}).png().toBuffer();
 const rendered=await officialPhotoOutput(input,2,officialPhotoOptions({
  slot:2,title:'공식 카드',cropX:0.4,cropY:0.6,zoom:1.3
 }));
 const meta=await sharp(rendered).metadata();
 assert.equal(meta.format,'webp');assert.equal(meta.width,536);assert.equal(meta.height,528);
 const hidden=await officialPhotoOutput(input,5,officialPhotoOptions({slot:5,title:'HIDDEN 제목'}));
 const hm=await sharp(hidden).metadata();
 assert.equal(hm.format,'png');
 assert.equal(hm.width,900);assert.equal(hm.height,850);
});
test('new path is generated for every draft upload to prevent overwriting existing published bytes',()=>{
 const a=officialStoragePaths('dog','draft',2),b=officialStoragePaths('dog','draft',2);
 assert.notEqual(a.original,b.original);
 assert.notEqual(a.display,b.display);
 assert.match(a.display,/display\.webp$/);
 assert.match(officialStoragePaths('dog','draft',5).display,/display\.png$/);
});
test('admin rejects slot 6 and invalid title, zoom or crop',()=>{
 for(const args of [
  {slot:6,title:'no'},
  {slot:2,title:''},
  {slot:5,title:''},
  {slot:3,title:'x'.repeat(31)},
  {slot:2,title:'valid',zoom:3.5},
  {slot:2,title:'valid',cropX:-0.2}
 ]) assert.throws(()=>officialPhotoOptions(args));
});
