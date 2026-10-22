export function draftSnapshot(form, items) {
  return JSON.stringify({
    form,
    photos: items.map(item => [item.id, item.url || '', item.file?.name || '', item.file?.size || 0, item.file?.lastModified || 0])
  });
}
