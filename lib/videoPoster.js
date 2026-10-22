export function videoFrameBounds(width, height, size = 640) {
  if (!(width > 0 && height > 0)) return null;
  const scale = Math.min(size / width, size / height);
  const drawWidth = Math.round(width * scale);
  const drawHeight = Math.round(height * scale);
  return { x: Math.round((size - drawWidth) / 2), y: Math.round((size - drawHeight) / 2), width: drawWidth, height: drawHeight };
}
