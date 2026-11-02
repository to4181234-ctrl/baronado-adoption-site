import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePostEdit} from '../lib/goPostEdit.js';
import {wrapCanvasText} from '../lib/goCardImage.js';
test('title-only edit trims and accepts 1–30 characters without modifying card identity or ratings',()=>{
 assert.deepEqual(validatePostEdit({title:' 제목 '}),{title:'제목'});
 assert.equal(validatePostEdit({title:'가'.repeat(30)}).title.length,30);
 for(const title of ['', '   ', '가'.repeat(31),null,3])assert.throws(()=>validatePostEdit({title}));
 for(const key of ['description','dogId','ratings','image_path','photo','capturedAt','ownerId','nickname','status'])assert.throws(()=>validatePostEdit({title:'제목',[key]:'changed'}));
 for(const input of [null,[],{},'title'])assert.throws(()=>validatePostEdit(input));
});
test('card text wrapping preserves Unicode and line boundaries',()=>{
 const ctx={measureText:text=>({width:Array.from(text).length})};
 assert.deepEqual(wrapCanvasText(ctx,'가나다라',2),['가나','다라']);
 assert.deepEqual(wrapCanvasText(ctx,'안녕\n멍멍',5),['안녕','멍멍']);
 assert.deepEqual(wrapCanvasText(ctx,'🐶🐶🐶🐶🐶',2,2),['🐶🐶','🐶…']);
});
