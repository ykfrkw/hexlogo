// imagetools.js
// Pure, dependency-free image-processing pipeline used to turn the
// as-uploaded subplot image (subplotOriginal) into the processed image that
// sticker.js/render.js actually draw (subplotImage). No app-state imports --
// this module only touches the DOM to create a throwaway <canvas>.

/** Load a data URL (or any same-origin-safe src) into an HTMLImageElement. */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('imagetools: failed to load image'));
    img.src = src;
  });
}

// Soft-edge band (in min(R,G,B) units) below the threshold over which alpha
// is ramped from fully opaque to fully transparent, so the cutoff doesn't
// leave a hard halo around non-white content.
const WHITE_SOFT_BAND = 24;

/**
 * Crop (optional) and/or white->transparent (optional) a source image.
 *
 * @param {string} originalDataUrl data URL of the as-uploaded image
 * @param {object} [opts]
 * @param {{x:number,y:number,w:number,h:number}|null} [opts.cropRect]
 *   Crop rectangle normalized to the image's natural pixel size (0..1
 *   fractions). null/undefined means "no crop" (use the full image).
 * @param {boolean} [opts.whiteTransparent] make near-white pixels transparent
 * @param {number} [opts.whiteThreshold] 128..255; min(R,G,B) at/above this
 *   value becomes fully transparent; see WHITE_SOFT_BAND for the soft edge.
 * @returns {Promise<string>} data URL (image/png) of the processed image
 */
export async function processSubplot(originalDataUrl, opts = {}) {
  const { cropRect = null, whiteTransparent = false, whiteThreshold = 240 } = opts;
  if (!originalDataUrl) throw new Error('imagetools: originalDataUrl is required');

  const img = await loadImage(originalDataUrl);
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;

  let sx = 0;
  let sy = 0;
  let sw = naturalW;
  let sh = naturalH;

  if (cropRect) {
    sx = Math.round(cropRect.x * naturalW);
    sy = Math.round(cropRect.y * naturalH);
    sw = Math.round(cropRect.w * naturalW);
    sh = Math.round(cropRect.h * naturalH);
    // Clamp defensively so a stale/out-of-range crop rect never produces an
    // empty or out-of-bounds source rectangle.
    sx = Math.max(0, Math.min(sx, naturalW - 1));
    sy = Math.max(0, Math.min(sy, naturalH - 1));
    sw = Math.max(1, Math.min(sw, naturalW - sx));
    sh = Math.max(1, Math.min(sh, naturalH - sy));
  }

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, sw, sh);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  if (whiteTransparent) {
    const imageData = ctx.getImageData(0, 0, sw, sh);
    const data = imageData.data;
    const hi = whiteThreshold;
    const lo = whiteThreshold - WHITE_SOFT_BAND;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue; // already transparent
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const m = Math.min(r, g, b);
      if (m >= hi) {
        data[i + 3] = 0;
      } else if (m >= lo) {
        // t: 0 at lo (opaque) -> 1 at hi (transparent)
        const t = (m - lo) / (hi - lo);
        data[i + 3] = Math.round(a * (1 - t));
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return canvas.toDataURL('image/png');
}
