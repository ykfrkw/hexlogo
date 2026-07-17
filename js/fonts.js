// fonts.js
// A small curated list of Google Fonts suitable for hex logos, loaded via a
// normal <link> in index.html (no bundler, no @font-face fetch at runtime
// for the *preview* -- only render.js fetches font files, for PNG export).

// `value` is the CSS font-family name as served by Google Fonts.
// `label` is shown in the UI dropdown.
// `googleFont` is the family name to request from fonts.googleapis.com and
// the family used when looking up a WOFF2 URL for PNG-export embedding.
export const FONT_LIST = [
  {
    id: 'aller',
    label: 'Aller-like (Muli)',
    value: "'Muli', sans-serif",
    googleFont: 'Muli',
  },
  {
    id: 'geometric-sans',
    label: 'Geometric Sans (Poppins)',
    value: "'Poppins', sans-serif",
    googleFont: 'Poppins',
  },
  {
    id: 'mono',
    label: 'Mono (Space Mono)',
    value: "'Space Mono', monospace",
    googleFont: 'Space Mono',
  },
  {
    id: 'slab',
    label: 'Slab Serif (Roboto Slab)',
    value: "'Roboto Slab', serif",
    googleFont: 'Roboto Slab',
  },
  {
    id: 'rounded',
    label: 'Rounded (Baloo 2)',
    value: "'Baloo 2', cursive",
    googleFont: 'Baloo 2',
  },
  {
    id: 'condensed',
    label: 'Condensed (Oswald)',
    value: "'Oswald', sans-serif",
    googleFont: 'Oswald',
  },
];

// hexSticker's default font is "Aller_Rg" (the regular weight of Aller, an
// open font by Dalton Maag bundled with the R package). Aller itself is not
// on Google Fonts, so we map it to the closest available web font: Muli, a
// similarly humanist / rounded grotesque sans.
const ALLER_FALLBACK = FONT_LIST[0];

/**
 * Resolve a hexSticker `p_family` / `u_family` value (which may be an R/font
 * family name like "Aller_Rg", "sans", or one of our own `id`s) to a CSS
 * font-family string usable in an SVG `font-family` attribute.
 */
export function resolveFontFamily(familyNameOrId) {
  if (!familyNameOrId) return ALLER_FALLBACK.value;

  const byId = FONT_LIST.find((f) => f.id === familyNameOrId);
  if (byId) return byId.value;

  const byGoogleName = FONT_LIST.find(
    (f) => f.googleFont.toLowerCase() === String(familyNameOrId).toLowerCase()
  );
  if (byGoogleName) return byGoogleName.value;

  if (String(familyNameOrId).toLowerCase().startsWith('aller')) return ALLER_FALLBACK.value;

  // Unknown family name (e.g. a plain CSS generic like "sans"): pass through.
  return familyNameOrId;
}

/** The font `id` used as the initial default selection for both text layers. */
export const DEFAULT_FONT_ID = ALLER_FALLBACK.id;
