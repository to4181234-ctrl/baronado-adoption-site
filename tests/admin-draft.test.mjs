import test from 'node:test';
import assert from 'node:assert/strict';
import { adminDraftKey, createAdminDraft, parseAdminDraft } from '../lib/adminDraft.js';

test('admin draft keeps edits and saved URLs without attempting to persist large files', () => {
  const form = { name: '미남', profile: { vaccinations_checked: ['rabies'], vaccination_dates: { rabies: '2026-01-12' } } };
  const draft = createAdminDraft(form, [{ id: 'p1', url: 'https://example.com/old.jpg' }, { id: 'p2', file: { size: 1 } }],
    [{ id: 'v1', url: 'https://example.com/old.mp4', posterUrl: 'https://example.com/poster.webp' }, { id: 'v2', file: { size: 3 }, posterFile: { size: 1 } }], 1234);
  const restored = parseAdminDraft(JSON.stringify(draft));
  assert.equal(restored.form.name, '미남');
  assert.equal(restored.form.profile.vaccination_dates.rabies, '2026-01-12');
  assert.deepEqual(restored.photos, [{ id: 'p1', url: 'https://example.com/old.jpg' }]);
  assert.deepEqual(restored.videos, [{ id: 'v1', url: 'https://example.com/old.mp4', posterUrl: 'https://example.com/poster.webp' }]);
  assert.equal(restored.omittedFiles, true);
  assert.equal(adminDraftKey('edit_abc'), 'baronado_admin_draft_v1_edit_abc');
  assert.equal(parseAdminDraft('{broken'), null);
});
