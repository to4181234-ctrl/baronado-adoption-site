// Keep each photo's place while newly selected and recropped files are uploaded.
export function resolveImageOrder(items, uploaded) {
  let nextUpload = 0;
  return items.map(item => item.file ? uploaded[nextUpload++] : item.url);
}
