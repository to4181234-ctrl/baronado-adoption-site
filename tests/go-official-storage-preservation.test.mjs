import test from 'node:test';
import assert from 'node:assert/strict';
import { removeUnusedDraftAssets } from '../lib/server/goOfficialStorage.js';

function database(rows = [], error = null) {
  const removed = [];
  return { removed, from() { return { select() { return {
    async in() { return { data: rows, error }; }
  }; } }; }, storage: { from() { return {
    async remove(paths) { removed.push(...paths); return { error: null }; }
  }; } } };
}
test('replacing a draft never deletes inherited published image bytes', async () => {
  const db = database();
  await removeUnusedDraftAssets(db, { dogId: 'dog', versionId: 'draft',
    paths: ['dog/published/1/a-original', 'dog/published/1/a-display.webp'] });
  assert.deepEqual(db.removed, []);
});
test('cleanup removes only unreferenced files owned by this draft', async () => {
  const shared = 'dog/draft/1/shared-display.webp';
  const db = database([{ display_path: shared }]);
  await removeUnusedDraftAssets(db, { dogId: 'dog', versionId: 'draft',
    paths: [shared, 'dog/draft/1/unused-original', 'other/draft/1/file'] });
  assert.deepEqual(db.removed, ['dog/draft/1/unused-original']);
});
test('failed reference lookup preserves old files', async () => {
  const db = database([], { message: 'DB unavailable' });
  await removeUnusedDraftAssets(db, { dogId: 'dog', versionId: 'draft',
    paths: ['dog/draft/1/a-original'] });
  assert.deepEqual(db.removed, []);
});
