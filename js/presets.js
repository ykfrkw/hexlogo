// presets.js
// A handful of starter variants (colour scheme + layout) plus a "generate
// colour variants" helper that palette-shifts the current state into N
// pickable options. Thumbnails are just buildStickerSVG() rendered small,
// so gallery and full preview are guaranteed to look the same.

import { defaultState } from './state.js';
import { buildStickerSVG } from './sticker.js';

// ---------------------------------------------------------------------------
// Sample subplot images (mirrors assets/sample-logo-*.svg). Inlined as data
// URIs so preset thumbnails/state never depend on a network fetch at
// runtime -- see those files under assets/ for the same artwork.
// ---------------------------------------------------------------------------

const SAMPLE_LEAF_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M50 8 C78 8 90 32 90 55 C90 78 70 92 50 92 C30 92 10 78 10 55 C10 32 22 8 50 8 Z"
        fill="#EAF6D8"/>
  <path d="M50 14 C74 16 84 36 84 55 C84 74 67 86 50 86 C33 86 16 74 16 55 C16 36 27 14 50 14 Z"
        fill="#9FD356"/>
  <path d="M50 18 L50 82 M50 34 L34 26 M50 48 L28 42 M50 62 L30 60 M50 34 L66 26 M50 48 L72 42 M50 62 L70 60"
        fill="none" stroke="#4C7A2A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const SAMPLE_CIRCUIT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="14" fill="none" stroke="#F2F5EA" stroke-width="3"/>
  <circle cx="50" cy="50" r="5" fill="#F2F5EA"/>
  <g stroke="#F2F5EA" stroke-width="3" stroke-linecap="round">
    <line x1="50" y1="8" x2="50" y2="36"/>
    <line x1="50" y1="64" x2="50" y2="92"/>
    <line x1="8" y1="50" x2="36" y2="50"/>
    <line x1="64" y1="50" x2="92" y2="50"/>
    <line x1="20" y1="20" x2="38" y2="38"/>
    <line x1="80" y1="20" x2="62" y2="38"/>
    <line x1="20" y1="80" x2="38" y2="62"/>
    <line x1="80" y1="80" x2="62" y2="62"/>
  </g>
  <g fill="#F2F5EA">
    <circle cx="50" cy="8" r="4"/>
    <circle cx="50" cy="92" r="4"/>
    <circle cx="8" cy="50" r="4"/>
    <circle cx="92" cy="50" r="4"/>
    <circle cx="20" cy="20" r="4"/>
    <circle cx="80" cy="20" r="4"/>
    <circle cx="20" cy="80" r="4"/>
    <circle cx="80" cy="80" r="4"/>
  </g>
</svg>`;

function svgToDataUri(svgMarkup) {
  return `data:image/svg+xml;base64,${btoa(svgMarkup)}`;
}

const SAMPLE_LEAF_DATA_URI = svgToDataUri(SAMPLE_LEAF_SVG);
const SAMPLE_CIRCUIT_DATA_URI = svgToDataUri(SAMPLE_CIRCUIT_SVG);

/**
 * Each preset is a partial state, merged onto defaultState() when applied.
 */
export const PRESETS = [
  {
    id: 'classic-blue',
    name: 'Classic Blue',
    overrides: {
      package: 'mypackage',
      h_fill: '#1881C2',
      h_color: '#87B13F',
      p_color: '#FFFFFF',
      spotlight: false,
      url: '',
    },
  },
  {
    id: 'midnight-spotlight',
    name: 'Midnight Spotlight',
    overrides: {
      package: 'nightowl',
      h_fill: '#151A2D',
      h_color: '#6C63FF',
      p_color: '#FFFFFF',
      spotlight: true,
      l_x: 1,
      l_y: 1.3,
      l_alpha: 0.5,
      url: 'example.com',
      subplotImage: SAMPLE_CIRCUIT_DATA_URI,
      subplotImageName: 'sample-logo-circuit.svg',
      s_x: 1,
      s_y: 0.72,
      s_width: 0.42,
      s_height: 0.42,
    },
  },
  {
    id: 'sunrise-url',
    name: 'Sunrise + URL',
    overrides: {
      package: 'sunrise',
      h_fill: '#FF8C42',
      h_color: '#FFD23F',
      p_color: '#2B1B17',
      spotlight: false,
      url: 'github.com/you/sunrise',
      u_color: '#2B1B17',
    },
  },
  {
    id: 'forest-subplot',
    name: 'Forest (image-forward)',
    overrides: {
      package: 'forest',
      h_fill: '#274029',
      h_color: '#A9C46C',
      p_color: '#F2F5EA',
      p_y: 0.35,
      subplotImage: SAMPLE_LEAF_DATA_URI,
      subplotImageName: 'sample-logo-leaf.svg',
      s_x: 1,
      s_y: 1.15,
      s_width: 0.62,
      s_height: 0.62,
      spotlight: false,
    },
  },
  {
    id: 'mono-slate',
    name: 'Mono Slate',
    overrides: {
      package: 'slatekit',
      h_fill: '#2E3440',
      h_color: '#D8DEE9',
      p_color: '#ECEFF4',
      spotlight: false,
      white_around_sticker: true,
    },
  },
  {
    id: 'candy-pop',
    name: 'Candy Pop',
    overrides: {
      package: 'candy',
      h_fill: '#FF4D8D',
      h_color: '#FFE066',
      p_color: '#FFFFFF',
      spotlight: true,
      l_x: 0.75,
      l_y: 1.4,
      l_alpha: 0.35,
      url: 'candy.pkg',
      u_color: '#FFFFFF',
    },
  },
];

export function applyPreset(preset) {
  return { ...defaultState(), ...preset.overrides };
}

/** Render a small SVG thumbnail for any state (used by preset gallery + variant picker). */
export function renderThumbnail(state, { pxPerUnit = 60 } = {}) {
  return buildStickerSVG(state, { pxPerUnit });
}

// ---------------------------------------------------------------------------
// Colour-variant generation: hue-rotate the current fill/border/url colours
// into N new palette options, keeping text colour readable against the fill.
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgbToHex({ r, g, b }) {
  const c = (n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

function rgbToHsl({ r, g, b }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToRgb({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return { r: (rp + m) * 255, g: (gp + m) * 255, b: (bp + m) * 255 };
}

function rotateHue(hex, degrees) {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl.h = (hsl.h + degrees + 360) % 360;
  return rgbToHex(hslToRgb(hsl));
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function readableTextColor(bgHex) {
  return relativeLuminance(bgHex) > 0.55 ? '#111111' : '#FFFFFF';
}

/**
 * Generate `count` palette variants of `baseState` by rotating hue around
 * the colour wheel, evenly spaced, starting from an offset so the first
 * variant isn't identical to the input.
 */
export function generateColorVariants(baseState, count = 6) {
  const step = 360 / count;
  const variants = [];
  for (let i = 1; i <= count; i += 1) {
    const degrees = step * i;
    const h_fill = rotateHue(baseState.h_fill, degrees);
    const h_color = rotateHue(baseState.h_color, degrees + 20);
    const p_color = readableTextColor(h_fill);
    variants.push({
      id: `variant-${i}-${Math.round(degrees)}`,
      name: `Variant ${i}`,
      state: { ...baseState, h_fill, h_color, p_color },
    });
  }
  return variants;
}
