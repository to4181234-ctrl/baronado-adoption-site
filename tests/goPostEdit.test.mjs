import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePostEdit} from '../lib/goPostEdit.js';
import {wrapCanvasText} from '../lib/goCardImage.js';
test('post edit permits text, dog and ratings but keeps original photo, date and author immutable',()=>{
 const edit=validatePostEdit({title:' 제목 ',description:' 설명 ',dogId:'dog',ratings:{cuteness:5,charm:4,affection:null}});
 assert.equal(edit.title,'제목');assert.equal(edit.description,'설명');assert.equal(edit.editContent,true);assert.equal(edit.ratings.cuteness,5);
 for(const key of ['image_path','photo','capturedAt','ownerId','nickname'])assert.throws(()=>validatePostEdit({[key]:'changed'}));
 assert.throws(()=>validatePostEdit({title:'only title'}));assert.throws(()=>validatePostEdit({title:'',description:'x',dogId:'dog'}));
 const ratings=validatePostEdit({ratings:{cuteness:3,charm:null,affection:2}});assert.equal(ratings.editContent,false);assert.equal(ratings.editRatings,true);
 assert.throws(()=>validatePostEdit({ratings:{cuteness:6}}));
});
test('card export wraps Unicode and newlines and truncates without splitting emoji',()=>{
 const ctx={measureText:text=>({width:Array.from(text).length})};
 assert.deepEqual(wrapCanvasText(ctx,'가나다라',2),['가나','다라']);
 assert.deepEqual(wrapCanvasText(ctx,'안녕\n멍멍',5),['안녕','멍멍']);
 assert.deepEqual(wrapCanvasText(ctx,'🐶🐶🐶🐶🐶',2,2),['🐶🐶','🐶…']);
});
