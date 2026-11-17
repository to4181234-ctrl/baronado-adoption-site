import { GO_OFFICIAL_BUCKET } from '../goOfficial.js';

// A new draft inherits paths from the published version. Those files are not
// owned by the draft and must survive replacement/cropping of its asset rows.
export async function removeUnusedDraftAssets(db, { dogId, versionId, paths }) {
  const prefix = `${dogId}/${versionId}/`;
  const candidates = [...new Set(paths)].filter(path =>
    typeof path === 'string' && path.startsWith(prefix));
  if (!candidates.length) return;
  try {
    const results = await Promise.all([
      db.from('go_official_assets').select('original_path,display_path')
        .in('original_path', candidates),
      db.from('go_official_assets').select('original_path,display_path')
        .in('display_path', candidates)
    ]);
    // If references cannot be checked, retain the bytes rather than risk loss.
    if (results.some(result => result.error)) return;
    const referenced = new Set(results.flatMap(result => result.data || [])
      .flatMap(asset => [asset.original_path, asset.display_path]));
    const unused = candidates.filter(path => !referenced.has(path));
    if (unused.length) await db.storage.from(GO_OFFICIAL_BUCKET).remove(unused);
  } catch {
    // Cleanup is optional; a saved draft must not fail because cleanup failed.
  }
}
