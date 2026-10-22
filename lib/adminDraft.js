export function draftSnapshot(form, items, videos = []) {
  return JSON.stringify({
    form,
    photos: items.map(item => [item.id, item.url || '', item.file?.name || '', item.file?.size || 0, item.file?.lastModified || 0]),
    videos: videos.map(item => [item.id, item.url || '', item.file?.name || '', item.file?.size || 0, item.file?.lastModified || 0])
  });
}
