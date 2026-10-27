// Optional, on-demand browser inference; model bytes never join the initial page bundle.
let loader;

async function modelTools() {
  if (!loader) loader = (async () => {
    const { pipeline } = await import('@huggingface/transformers');
    const id = 'xrds/isnet-general-onnx-int8';
    const device = typeof navigator !== 'undefined' && navigator.gpu ? 'webgpu' : 'wasm';
    return pipeline('background-removal', id, { dtype: 'q8', device });
  })().catch(error => { loader = null; throw error; });
  return loader;
}

export async function removeDogBackground(originalBlob) {
  const segmenter = await modelTools();
  const url = URL.createObjectURL(originalBlob);
  try {
    const output = await segmenter(url);
    const bitmap = await createImageBitmap(originalBlob);
    const mask = await output[0].resize(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < canvas.width * canvas.height; i++) {
      pixels.data[i * 4 + 3] = Math.round(pixels.data[i * 4 + 3] * mask.data[i * mask.channels] / 255);
    }
    ctx.putImageData(pixels, 0, 0);
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('이미지를 만들지 못했어요.')), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}
