// fonts.js
// A curated list of Google Fonts suitable for hex logos, loaded via a normal
// <link> in index.html (no bundler, no @font-face fetch at runtime for the
// *preview* -- only render.js fetches font files, for PNG export).

// `value` is the CSS font-family name as served by Google Fonts.
// `label` is shown in the UI dropdown.
// `googleFont` is the family name to request from fonts.googleapis.com and
// the family used when looking up a WOFF2 URL for PNG-export embedding.
// `group` is used to organize the UI <select> into <optgroup>s.
export const FONT_LIST = [
  // --- Sans -------------------------------------------------------------
  { id: 'inter', label: 'Inter', value: "'Inter', sans-serif", googleFont: 'Inter', group: 'Sans' },
  { id: 'poppins', label: 'Poppins', value: "'Poppins', sans-serif", googleFont: 'Poppins', group: 'Sans' },
  { id: 'montserrat', label: 'Montserrat', value: "'Montserrat', sans-serif", googleFont: 'Montserrat', group: 'Sans' },
  { id: 'raleway', label: 'Raleway', value: "'Raleway', sans-serif", googleFont: 'Raleway', group: 'Sans' },
  { id: 'nunito', label: 'Nunito', value: "'Nunito', sans-serif", googleFont: 'Nunito', group: 'Sans' },
  { id: 'work-sans', label: 'Work Sans', value: "'Work Sans', sans-serif", googleFont: 'Work Sans', group: 'Sans' },
  { id: 'dm-sans', label: 'DM Sans', value: "'DM Sans', sans-serif", googleFont: 'DM Sans', group: 'Sans' },
  { id: 'rubik', label: 'Rubik', value: "'Rubik', sans-serif", googleFont: 'Rubik', group: 'Sans' },
  { id: 'outfit', label: 'Outfit', value: "'Outfit', sans-serif", googleFont: 'Outfit', group: 'Sans' },
  { id: 'space-grotesk', label: 'Space Grotesk', value: "'Space Grotesk', sans-serif", googleFont: 'Space Grotesk', group: 'Sans' },

  // --- Display & Rounded -------------------------------------------------
  { id: 'oswald', label: 'Oswald', value: "'Oswald', sans-serif", googleFont: 'Oswald', group: 'Display & Rounded' },
  { id: 'bebas-neue', label: 'Bebas Neue', value: "'Bebas Neue', cursive", googleFont: 'Bebas Neue', group: 'Display & Rounded' },
  { id: 'righteous', label: 'Righteous', value: "'Righteous', cursive", googleFont: 'Righteous', group: 'Display & Rounded' },
  { id: 'baloo-2', label: 'Baloo 2', value: "'Baloo 2', cursive", googleFont: 'Baloo 2', group: 'Display & Rounded' },
  { id: 'lobster', label: 'Lobster', value: "'Lobster', cursive", googleFont: 'Lobster', group: 'Display & Rounded' },

  // --- Slab & Serif -------------------------------------------------------
  { id: 'roboto-slab', label: 'Roboto Slab', value: "'Roboto Slab', serif", googleFont: 'Roboto Slab', group: 'Slab & Serif' },
  { id: 'bitter', label: 'Bitter', value: "'Bitter', serif", googleFont: 'Bitter', group: 'Slab & Serif' },
  { id: 'playfair-display', label: 'Playfair Display', value: "'Playfair Display', serif", googleFont: 'Playfair Display', group: 'Slab & Serif' },

  // --- Mono ---------------------------------------------------------------
  { id: 'space-mono', label: 'Space Mono', value: "'Space Mono', monospace", googleFont: 'Space Mono', group: 'Mono' },
  { id: 'jetbrains-mono', label: 'JetBrains Mono', value: "'JetBrains Mono', monospace", googleFont: 'JetBrains Mono', group: 'Mono' },
  { id: 'ibm-plex-mono', label: 'IBM Plex Mono', value: "'IBM Plex Mono', monospace", googleFont: 'IBM Plex Mono', group: 'Mono' },
];

/** The font `id` used as the initial default selection for both text layers. */
export const DEFAULT_FONT_ID = 'poppins';

const DEFAULT_FONT = FONT_LIST.find((f) => f.id === DEFAULT_FONT_ID);

/**
 * Resolve a `p_family` / `u_family` value (a font `id`, a Google Font family
 * name, or an arbitrary CSS family string) to a CSS font-family string usable
 * in an SVG `font-family` attribute.
 */
export function resolveFontFamily(familyNameOrId) {
  if (!familyNameOrId) return DEFAULT_FONT.value;

  const byId = FONT_LIST.find((f) => f.id === familyNameOrId);
  if (byId) return byId.value;

  const byGoogleName = FONT_LIST.find(
    (f) => f.googleFont.toLowerCase() === String(familyNameOrId).toLowerCase()
  );
  if (byGoogleName) return byGoogleName.value;

  // Unknown family name (e.g. a plain CSS generic like "sans"): pass through.
  return familyNameOrId;
}
