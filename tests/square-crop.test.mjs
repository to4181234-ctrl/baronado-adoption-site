import test from 'node:test';
import assert from 'node:assert/strict';
import { clampPosition, cropSource } from '../lib/squareCrop.js';

test('portrait image crops to a centered square without empty edges', () => {
  const source = cropSource({ width: 800, height: 1600 }, 320, 1, { x: 0, y: 0 });
  assert.deepEqual(source, { x: 0, y: 400, size: 800 });
});

test('drag and zoom remain inside the original image', () => {
  const dimensions = { width: 1600, height: 800 };
  const offset = clampPosition({ x: 9999, y: -9999 }, dimensions, 320, 2);
  const source = cropSource(dimensions, 320, 2, offset);
  assert.ok(source.x >= 0 && source.y >= 0);
  assert.ok(source.x + source.size <= dimensions.width);
  assert.ok(source.y + source.size <= dimensions.height);
  assert.equal(source.size, 400);
});
