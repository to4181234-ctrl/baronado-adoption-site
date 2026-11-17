import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALBUM_SELECTION_LIMIT,
  changeAlbumSelection,
  lastAlbumPage,
  toggleAlbumSelection,
} from '../lib/goAlbumSelection.js';

test('selection mode remains open after first selection', () => {
  assert.deepEqual(changeAlbumSelection([], 'card-a'), {
    selectedIds: ['card-a'], selectionMode: true,
  });
});

test('deselecting final card leaves selection mode', () => {
  assert.deepEqual(changeAlbumSelection(['card-a'], 'card-a'), {
    selectedIds: [], selectionMode: false,
  });
});

test('removing one of multiple cards retains selection mode', () => {
  assert.deepEqual(changeAlbumSelection(['card-a', 'card-b'], 'card-a'), {
    selectedIds: ['card-b'], selectionMode: true,
  });
});

test('page changes do not remove ids in previous pages', () => {
  const priorPage = ['card-page-one'];
  const nextPage = changeAlbumSelection(priorPage, 'card-page-two');
  assert.deepEqual(nextPage.selectedIds, ['card-page-one', 'card-page-two']);
});

test('selection limits to 50 and disallows duplicates', () => {
  const ids = Array.from({length: ALBUM_SELECTION_LIMIT}, (_, i) => 'card-' + i);
  assert.deepEqual(toggleAlbumSelection(ids, 'new-card'), ids);
  assert.deepEqual(toggleAlbumSelection(ids, 'card-4'), ids.filter(id => id !== 'card-4'));
});

test('last page clamps after deletion', () => {
  assert.equal(lastAlbumPage(9), 2);
  assert.equal(lastAlbumPage(8), 1);
  assert.equal(lastAlbumPage(0), 0);
});
