// presets.js
// A handful of starter variants (colour scheme + layout) plus a "generate
// colour variants" helper that builds harmonious palette shifts of the
// current state into N pickable options. Thumbnails are just
// buildStickerSVG() rendered small, so gallery and full preview are
// guaranteed to look the same.

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
    id: 'ocean',
    name: 'Ocean',
    overrides: {
      package: 'oceanpkg',
      h_fill: '#0B3D5C',
      h_color: '#4FC3F7',
      p_color: '#FFFFFF',
      spotlight: false,
      url: '',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    overrides: {
      package: 'nordic',
      h_fill: '#2E3440',
      h_color: '#88C0D0',
      p_color: '#ECEFF4',
      spotlight: false,
      url: 'github.com/you/nord',
      u_color: '#D8DEE9',
    },
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin',
    overrides: {
      package: 'catppkg',
      h_fill: '#1E1E2E',
      h_color: '#CBA6F7',
      p_color: '#CDD6F4',
      spotlight: true,
      l_x: 1,
      l_y: 1.3,
      l_alpha: 0.35,
    },
  },
  {
    id: 'rose-pine',
    name: 'Rosé Pine',
    overrides: {
      package: 'rosepine',
      h_fill: '#191724',
      h_color: '#EBBCBA',
      p_color: '#E0DEF4',
      spotlight: false,
    },
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    overrides: {
      package: 'gruvbox',
      h_fill: '#282828',
      h_color: '#FABD2F',
      p_color: '#EBDBB2',
      p_family: 'jetbrains-mono',
      spotlight: false,
    },
  },
  {
    id: 'sage',
    name: 'Sage',
    overrides: {
      package: 'sage',
      h_fill: '#3A5A40',
      h_color: '#A3B18A',
      p_color: '#DAD7CD',
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
    id: 'sunset',
    name: 'Sunset',
    overrides: {
      package: 'sunset',
      h_fill: '#E76F51',
      h_color: '#F4A261',
      p_color: '#FFF8F0',
      subplotImage: SAMPLE_CIRCUIT_DATA_URI,
      subplotImageName: 'sample-logo-circuit.svg',
      s_x: 1,
      s_y: 0.72,
      s_width: 0.42,
      s_height: 0.42,
      spotlight: true,
      l_alpha: 0.25,
    },
  },
  {
    id: 'paper',
    name: 'Paper',
    overrides: {
      package: 'paperpkg',
      h_fill: '#FAFAFA',
      h_color: '#18181B',
      p_color: '#18181B',
      white_around_sticker: true,
      spotlight: false,
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
// Colour-variant generation: derive harmonious colour schemes (complementary,
// analogous, triadic, lightness-shifted) from the current fill colour into N
// new palette options, keeping text colour readable against the fill.
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

function shiftHsl(hsl, { h = 0, s = 0, l = 0 } = {}) {
  return {
    h: (hsl.h + h + 360) % 360,
    s: Math.min(1, Math.max(0, hsl.s + s)),
    l: Math.min(1, Math.max(0.06, hsl.l + l)),
  };
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function readableTextColor(bgHex) {
  return relativeLuminance(bgHex) > 0.55 ? '#111111' : '#FFFFFF';
}

// Named colour-harmony schemes. Each maps the base fill hue/sat/light to a
// new fill and border hue -- combining hue rotation (complementary /
// analogous / triadic) with a lightness shift so fill and border stay
// visually distinct.
const COLOR_SCHEMES = [
  {
    name: 'Complementary',
    fill: (base) => shiftHsl(base, { h: 180 }),
    border: (base) => shiftHsl(base, { h: 180 + 25, l: 0.18 }),
  },
  {
    name: 'Analogous +30',
    fill: (base) => shiftHsl(base, { h: 30 }),
    border: (base) => shiftHsl(base, { h: 60, l: 0.18 }),
  },
  {
    name: 'Analogous -30',
    fill: (base) => shiftHsl(base, { h: -30 }),
    border: (base) => shiftHsl(base, { h: -60, l: 0.18 }),
  },
  {
    name: 'Triadic +120',
    fill: (base) => shiftHsl(base, { h: 120 }),
    border: (base) => shiftHsl(base, { h: 120 + 25, l: 0.18 }),
  },
  {
    name: 'Triadic -120',
    fill: (base) => shiftHsl(base, { h: -120 }),
    border: (base) => shiftHsl(base, { h: -120 + 25, l: 0.18 }),
  },
  {
    name: 'Deep & Light',
    fill: (base) => shiftHsl(base, { h: 10, l: -0.16 }),
    border: (base) => shiftHsl(base, { h: 10, l: 0.3 }),
  },
];

/**
 * Generate `count` palette variants of `baseState` by deriving harmonious
 * fill/border hues from the current h_fill (complementary, analogous,
 * triadic, lightness-shifted), keeping text colour readable against the
 * new fill.
 */
export function generateColorVariants(baseState, count = 6) {
  const baseHsl = rgbToHsl(hexToRgb(baseState.h_fill));
  const variants = [];
  for (let i = 0; i < count; i += 1) {
    const scheme = COLOR_SCHEMES[i % COLOR_SCHEMES.length];
    // Once we've cycled through every named scheme, nudge the hue further so
    // additional variants (count > COLOR_SCHEMES.length) aren't duplicates.
    const cycle = Math.floor(i / COLOR_SCHEMES.length);
    const jitter = cycle * 12;
    const fillHsl = shiftHsl(scheme.fill(baseHsl), { h: jitter });
    const borderHsl = shiftHsl(scheme.border(baseHsl), { h: jitter });
    const h_fill = rgbToHex(hslToRgb(fillHsl));
    const h_color = rgbToHex(hslToRgb(borderHsl));
    const p_color = readableTextColor(h_fill);
    variants.push({
      id: `variant-${i + 1}-${scheme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: scheme.name,
      state: { ...baseState, h_fill, h_color, p_color },
    });
  }
  return variants;
}
