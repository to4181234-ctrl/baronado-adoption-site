import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveImageOrder } from '../lib/photoOrder.js';

test('reordering existing and new photos preserves the selected representative', () => {
  const items = [{ file: { name: 'new.jpg' } }, { url: 'old-first' }, { url: 'old-second', file: { name: 'recropped.jpg' } }];
  assert.deepEqual(resolveImageOrder(items, ['uploaded-new', 'uploaded-recrop']), ['uploaded-new', 'old-first', 'uploaded-recrop']);
});
