export function clampPosition(position, dimensions, frameSize, zoom) {
  if (!dimensions.width || !dimensions.height) return { x: 0, y: 0 };
  const scale = Math.max(frameSize / dimensions.width, frameSize / dimensions.height) * zoom;
  const maxX = Math.max(0, (dimensions.width * scale - frameSize) / 2);
  const maxY = Math.max(0, (dimensions.height * scale - frameSize) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, position.x)),
    y: Math.min(maxY, Math.max(-maxY, position.y))
  };
}

export function cropSource(dimensions, frameSize, zoom, position) {
  const scale = Math.max(frameSize / dimensions.width, frameSize / dimensions.height) * zoom;
  const offset = clampPosition(position, dimensions, frameSize, zoom);
  const size = frameSize / scale;
  return {
    x: dimensions.width / 2 - (frameSize / 2 + offset.x) / scale,
    y: dimensions.height / 2 - (frameSize / 2 + offset.y) / scale,
    size
  };
}
