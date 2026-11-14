import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { officialPhotoOptions,officialPhotoOutput,GO_OFFICIAL_PHOTO_WIDTH,GO_OFFICIAL_PHOTO_HEIGHT } from '../lib/goOfficial.js';
test('official card has five titled photos and untitled hidden slot',()=>{
 for(let slot=1;slot<=5;slot++)assert.equal(officialPhotoOptions({slot,title:'강아지 카드'}).slot,slot);
 assert.equal(officialPhotoOptions({slot:6,title:''}).slot,6);
 assert.throws(()=>officialPhotoOptions({slot:7,title:'invalid'}));
 assert.throws(()=>officialPhotoOptions({slot:1,title:''}));
 assert.throws(()=>officialPhotoOptions({slot:1,title:'X',cropX:1.2}));
 assert.throws(()=>officialPhotoOptions({slot:1,title:'X',zoom:4}));
});
test('server crops official photo to exact Figma photo viewport and preserves original',async()=>{
 const source=await sharp({create:{width:960,height:720,channels:3,background:'#eee'}}).png().toBuffer();
 const cropped=await officialPhotoOutput(source,2,{title:'강아지',cropX:0,cropY:1,zoom:1.8});
 const m=await sharp(cropped).metadata();
 assert.equal(m.width,GO_OFFICIAL_PHOTO_WIDTH);assert.equal(m.height,GO_OFFICIAL_PHOTO_HEIGHT);assert.equal(m.format,'webp');
 const hidden=await officialPhotoOutput(source,6,{title:''});
 assert.equal((await sharp(hidden).metadata()).format,'png');
});
