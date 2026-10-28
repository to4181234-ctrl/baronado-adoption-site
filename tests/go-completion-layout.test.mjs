import test from 'node:test';
import assert from 'node:assert/strict';
import {completionFit} from '../lib/goCompletionLayout.js';
test('entire card fits into short mobile and landscape stages, including long records',()=>{
 for(const width of [284,339,394,620])for(const height of [100,190,310,500])for(const cardHeight of [420,650,1100]){const fit=completionFit(width,height,cardHeight);assert.ok(320*fit.scale<=width-90);assert.ok(cardHeight*fit.scale<=height-40);}
});
