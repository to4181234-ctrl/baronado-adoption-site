export function draftSnapshot(form, items, videos = []) {
  return JSON.stringify({
    form,
    photos: items.map(item => [item.id, item.url || '', item.file?.name || '', item.file?.size || 0, item.file?.lastModified || 0]),
    videos: videos.map(item => [item.id, item.url || '', item.file?.name || '', item.file?.size || 0, item.file?.lastModified || 0,
      item.posterUrl || '', item.posterFile?.size || 0, item.posterFile?.lastModified || 0])
  });
}

export function adminDraftKey(scope) {
  return `baronado_admin_draft_v1_${scope}`;
}

export function createAdminDraft(form, photos, videos, savedAt = Date.now()) {
  return {
    version: 1,
    savedAt,
    form,
    photos: photos.filter(item => item.url).map(item => ({ id: item.id, url: item.url })),
    videos: videos.filter(item => item.url).map(item => ({ id: item.id, url: item.url, posterUrl: item.posterUrl || '' })),
    omittedFiles: photos.some(item => item.file) || videos.some(item => item.file || item.posterFile)
  };
}

export function parseAdminDraft(raw) {
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !data.form || typeof data.form !== 'object' || Array.isArray(data.form) ||
      !Array.isArray(data.photos) || !Array.isArray(data.videos) || !Number.isFinite(data.savedAt)) return null;
    return {
      ...data,
      photos: data.photos.filter(item => typeof item?.url === 'string' && typeof item?.id === 'string').slice(0, 3),
      videos: data.videos.filter(item => typeof item?.url === 'string' && typeof item?.id === 'string').slice(0, 2)
    };
  } catch { return null; }
}
