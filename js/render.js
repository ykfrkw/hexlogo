// render.js
// PNG / SVG / favicon export. Preview and export both go through
// sticker.js's buildStickerSVG, so what you see is what you get.
//
// PNG-EXPORT FONT GOTCHA
// -----------------------
// Rasterizing an SVG via `new Image()` -> `<canvas>` runs the SVG in an
// "isolated" image context: it CANNOT see the page's loaded @font-face /
// <link> web fonts, so text silently falls back to the browser's default
// serif/sans-serif and looks wrong (or, worse, looks fine on the authoring
// machine but breaks for users without that font installed).
//
// We solve this by embedding the actual font files used (package/url text)
// directly into the exported SVG as base64 `@font-face` rules before
// rasterizing (see embedFontsForExport below). fonts.gstatic.com serves
// permissive CORS headers so this fetch works from a static GitHub Pages
// site with no server involved.

import { DATA_WIDTH, DATA_HEIGHT, standardStickerPx } from './geometry.js';
import { buildStickerSVG, svgToString, DEFAULT_PX_PER_UNIT } from './sticker.js';
import { FONT_LIST, resolveFontFamily } from './fonts.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// ---------------------------------------------------------------------------
// Font embedding
// ---------------------------------------------------------------------------

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function fetchAndEmbedFontFace(googleFontName) {
  const familyParam = googleFontName.replace(/ /g, '+');
  const cssUrl = `https://fonts.googleapis.com/css2?family=${familyParam}:ital,wght@0,400;0,700;1,400;1,700&display=swap`;
  // Some families (e.g. Bebas Neue, Righteous, Lobster) only ship weight 400,
  // and the css2 API returns HTTP 400 when the axis spec asks for weights the
  // family doesn't have -- so fall back to the plain form (default 400 only).
  const fallbackCssUrl = `https://fonts.googleapis.com/css2?family=${familyParam}&display=swap`;

  let cssText;
  try {
    let res = await fetch(cssUrl);
    if (!res.ok) res = await fetch(fallbackCssUrl);
    if (!res.ok) return '';
    cssText = await res.text();
  } catch (err) {
    console.warn('[hexsticker] could not fetch Google Font CSS for', googleFontName, err);
    return '';
  }

  const faceBlocks = cssText.match(/@font-face\s*{[^}]*}/g) || [];
  const embedded = [];

  for (const block of faceBlocks) {
    const urlMatch = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)\s*format\('woff2'\)/);
    if (!urlMatch) continue;
    const fontUrl = urlMatch[1];
    try {
      const fontRes = await fetch(fontUrl);
      if (!fontRes.ok) continue;
      const buf = await fontRes.arrayBuffer();
      const base64 = arrayBufferToBase64(buf);
      const dataUri = `data:font/woff2;base64,${base64}`;
      embedded.push(block.replace(urlMatch[0], `url(${dataUri}) format('woff2')`));
    } catch (err) {
      console.warn('[hexsticker] could not embed font file', fontUrl, err);
    }
  }

  return embedded.join('\n');
}

/**
 * Mutates (a clone of) an sticker SVG element, injecting base64-embedded
 * @font-face rules for every distinct font family actually used by the
 * package/url text layers, so PNG rasterization renders real glyphs.
 */
async function embedFontsForExport(svgEl, state) {
  const families = new Set();
  if (state.package) families.add(resolveFontFamily(state.p_family));
  if (state.url) families.add(resolveFontFamily(state.u_family));
  if (families.size === 0) return svgEl;

  const googleNames = new Set();
  for (const cssFamily of families) {
    const entry = FONT_LIST.find((f) => f.value === cssFamily);
    if (entry) googleNames.add(entry.googleFont);
  }
  if (googleNames.size === 0) return svgEl;

  const cssBlocks = await Promise.all([...googleNames].map(fetchAndEmbedFontFace));
  const css = cssBlocks.filter(Boolean).join('\n');
  if (!css) return svgEl;

  const style = document.createElementNS(SVG_NS, 'style');
  style.textContent = css;
  const defs = svgEl.querySelector('defs') || svgEl.insertBefore(document.createElementNS(SVG_NS, 'defs'), svgEl.firstChild);
  defs.insertBefore(style, defs.firstChild);
  return svgEl;
}

// ---------------------------------------------------------------------------
// Core rasterization
// ---------------------------------------------------------------------------

/** Build an export-ready (fonts embedded) SVG element for the given state. */
export async function buildExportSVG(state, { pxPerUnit } = {}) {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (_) {
      /* ignore */
    }
  }
  const svg = buildStickerSVG(state, { pxPerUnit: pxPerUnit || DEFAULT_PX_PER_UNIT });
  await embedFontsForExport(svg, state);
  return svg;
}

/**
 * Rasterize the sticker to a transparent PNG at the given pixel width.
 * Height is derived from the fixed hex aspect ratio (sqrt(3) : 2).
 * @returns {Promise<Blob>}
 */
export async function exportPNG(state, targetWidthPx) {
  const targetHeightPx = Math.round((targetWidthPx * DATA_HEIGHT) / DATA_WIDTH);
  const pxPerUnit = targetWidthPx / DATA_WIDTH;

  const svg = await buildExportSVG(state, { pxPerUnit });
  const svgString = svgToString(svg);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = targetWidthPx;
    canvas.height = targetHeightPx;
    const ctx = canvas.getContext('2d');
    // Transparent canvas: no background fill.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, targetWidthPx, targetHeightPx);
    return await canvasToBlob(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** Build a downloadable SVG string (fonts embedded) for the given state. */
export async function exportSVG(state) {
  const svg = await buildExportSVG(state, { pxPerUnit: DEFAULT_PX_PER_UNIT });
  return svgToString(svg);
}

// ---------------------------------------------------------------------------
// Multi-size export
// ---------------------------------------------------------------------------

/** Sizes expressed as a target hex width in px (height derived from aspect). */
export const FIXED_WIDTH_SIZES = [
  { id: 'w512', label: '512px', widthPx: 512 },
  { id: 'w1024', label: '1024px', widthPx: 1024 },
  { id: 'favicon48', label: 'Favicon 48px', widthPx: 48 },
];

/** Sizes expressed as print dpi against the standard 43.9 x 50.8mm sticker. */
export const DPI_SIZES = [
  { id: 'dpi300', label: '300 dpi', dpi: 300 },
  { id: 'dpi600', label: '600 dpi', dpi: 600 },
  { id: 'dpi1200', label: '1200 dpi', dpi: 1200 },
];

export function allExportSizes() {
  return [
    ...DPI_SIZES.map((s) => ({ ...s, widthPx: Math.round(standardStickerPx(s.dpi).width) })),
    ...FIXED_WIDTH_SIZES,
  ];
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function triggerTextDownload(text, filename, mime = 'image/svg+xml') {
  triggerDownload(new Blob([text], { type: mime }), filename);
}

/** Export a single named size (see allExportSizes()) and trigger a download. */
export async function exportSizeById(state, sizeId, baseName) {
  const size = allExportSizes().find((s) => s.id === sizeId);
  if (!size) throw new Error(`Unknown export size: ${sizeId}`);
  const blob = await exportPNG(state, size.widthPx);
  triggerDownload(blob, `${baseName}-${size.label.replace(/\s+/g, '')}.png`);
}

/** Export every standard size (PNG) plus the vector SVG, each as a separate download. */
export async function exportAllSizes(state, baseName = 'hexsticker') {
  const svgString = await exportSVG(state);
  triggerTextDownload(svgString, `${baseName}.svg`);

  for (const size of allExportSizes()) {
    const blob = await exportPNG(state, size.widthPx);
    triggerDownload(blob, `${baseName}-${size.label.replace(/\s+/g, '')}.png`);
    // Small delay so browsers don't clump/blocking multi-file downloads.
    await new Promise((r) => setTimeout(r, 150));
  }
}
