import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleAlbumSelection, lastAlbumPage, albumRankPercent, ALBUM_PAGE_SIZE, ALBUM_SELECTION_LIMIT } from '../lib/goAlbumSelection.js';

test('Figma dog album uses 4 cards per page and 50 maximum selected', () => {
  assert.equal(ALBUM_PAGE_SIZE, 4);
  assert.equal(ALBUM_SELECTION_LIMIT, 50);
});

test('selection remains distinct by card ID, no duplicates, and can be unchecked', () => {
  assert.deepEqual(toggleAlbumSelection(['a'], 'b'), ['a', 'b']);
  assert.deepEqual(toggleAlbumSelection(['a', 'b'], 'a'), ['b']);
  assert.deepEqual(toggleAlbumSelection(['a','b'], 'b'), ['a']);
});

test('selection respects bulk API upper limit', () => {
  const before = Array.from({ length: 50 }, (_, i) => String(i));
  assert.deepEqual(toggleAlbumSelection(before, 'extra'), before);
  assert.equal(toggleAlbumSelection(before, '0').length, 49);
});

test('last page clamps after deleting cards instead of staying blank', () => {
  assert.equal(lastAlbumPage(0), 0);
  assert.equal(lastAlbumPage(1), 0);
  assert.equal(lastAlbumPage(4), 0);
  assert.equal(lastAlbumPage(5), 1);
  assert.equal(lastAlbumPage(8), 1);
  assert.equal(lastAlbumPage(9), 2);
});

test('Figma joint rank uses ceil(rank / participants * 100)', () => {
  assert.equal(albumRankPercent(1, 10), 10);
  assert.equal(albumRankPercent(2, 17), 12);
  assert.equal(albumRankPercent(1, 8), 13);
  assert.equal(albumRankPercent(0, 0), null);
});
