/** Return the camera pixels *inside the visible Figma 1:1 guide*.
 * The video is object-fit: cover and may be scaled digitally around its center.
 * Hardware camera zoom is already baked into the video frames; digitalZoom only
 * describes the remaining CSS transform, avoiding accidental double zoom.
 */
export function getCameraGuideCrop({
  videoWidth,videoHeight,containerWidth,containerHeight,
  guideLeft,guideTop,guideWidth,guideHeight,digitalZoom=1
}) {
  const dimensions=[videoWidth,videoHeight,containerWidth,containerHeight,guideWidth,guideHeight,digitalZoom];
  if(dimensions.some(n=>!Number.isFinite(n)||n<=0)||![guideLeft,guideTop].every(Number.isFinite)) {
    throw new RangeError('Camera geometry must be finite and positive');
  }
  const pixelsPerSourcePixel=Math.max(containerWidth/videoWidth,containerHeight/videoHeight)*digitalZoom;
  const side=Math.min(videoWidth,videoHeight,Math.min(guideWidth,guideHeight)/pixelsPerSourcePixel);
  const sourceCenterX=videoWidth/2+(guideLeft+guideWidth/2-containerWidth/2)/pixelsPerSourcePixel;
  const sourceCenterY=videoHeight/2+(guideTop+guideHeight/2-containerHeight/2)/pixelsPerSourcePixel;
  return {
    x:Math.max(0,Math.min(videoWidth-side,sourceCenterX-side/2)),
    y:Math.max(0,Math.min(videoHeight-side,sourceCenterY-side/2)),
    side
  };
}
