// sticker.js
// Builds a full <svg> element representing a hex sticker from a state object.
// This ONE builder is reused for the live preview, preset/variant thumbnails,
// and PNG/SVG export, so "preview == export" by construction.

import {
  hexVertices,
  hexPointsAttr,
  dataToSvg,
  viewBoxSize,
  HEX_CENTER,
  mmToDataUnits,
  SQRT3,
} from './geometry.js';
import { resolveFontFamily } from './fonts.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// ---------------------------------------------------------------------------
// Calibration constants (documented; tune here only).
// ---------------------------------------------------------------------------

// p_size / u_size are text-size values (roughly, mm of cap height). We
// convert to an SVG font-size expressed in *data units* by treating `size`
// as millimetres and applying a single tunable multiplier so that the
// default package label (p_size = 8, "mypackage") fills the hex in a
// visually pleasing way.
//   fontSizeDataUnits = (size_mm / 25.4) * TEXT_SCALE
// TEXT_SCALE = 0.7 was chosen empirically: at p_size = 8 this yields a
// font-size of ~0.22 data units, i.e. ~66px at the default 300px/unit
// internal scale -- "mypackage" then spans roughly 70% of the hex width.
export const TEXT_SCALE = 0.7;

// h_size is a linewidth-style value for the border polygon, not a physical
// unit by itself. We map it to a border width in millimetres via a single
// tunable constant so the default h_size = 1.2 produces a clearly visible
// ~1.5mm border.
//   strokeWidthMm = h_size * STROKE_MM_PER_HSIZE
export const STROKE_MM_PER_HSIZE = 1.25;

// When white_around_sticker is enabled, the sticker content is drawn at this
// fraction of the full hex radius, leaving a white margin ring around it
// that fills the rest of the (fixed-size) output canvas.
export const WHITE_MARGIN_SCALE = 0.9;

// Internal rendering resolution: how many SVG px correspond to 1 data unit
// inside buildStickerSVG when no explicit pxPerUnit is requested.
export const DEFAULT_PX_PER_UNIT = 300;

let _idCounter = 0;
function nextId(prefix) {
  _idCounter += 1;
  return `${prefix}-${_idCounter}`;
}

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    node.setAttribute(k, v);
  }
  return node;
}

/** Scale a data-space point toward/away from the hex center by `scale`. */
function scaleFromCenter(x, y, scale) {
  return {
    x: HEX_CENTER.x + (x - HEX_CENTER.x) * scale,
    y: HEX_CENTER.y + (y - HEX_CENTER.y) * scale,
  };
}

/** Data point -> SVG px point, honoring an optional content scale. */
function toSvg(x, y, pxPerUnit, contentScale) {
  const p = scaleFromCenter(x, y, contentScale);
  return dataToSvg(p.x, p.y, pxPerUnit);
}

function fontWeightStyle(fontface) {
  switch (fontface) {
    case 'bold':
      return { weight: 'bold', style: 'normal' };
    case 'italic':
      return { weight: 'normal', style: 'italic' };
    case 'bold.italic':
      return { weight: 'bold', style: 'italic' };
    default:
      return { weight: 'normal', style: 'normal' };
  }
}

/**
 * Build a full sticker <svg> element from a state object.
 * @param {object} state
 * @param {object} [opts]
 * @param {number} [opts.pxPerUnit] internal rendering scale (px per data unit)
 * @param {string} [opts.idPrefix] unique id prefix (auto-generated if omitted)
 * @returns {SVGSVGElement}
 */
export function buildStickerSVG(state, opts = {}) {
  const pxPerUnit = opts.pxPerUnit || DEFAULT_PX_PER_UNIT;
  const idPrefix = opts.idPrefix || nextId('hex');
  const vb = viewBoxSize(pxPerUnit);

  const svg = el('svg', {
    xmlns: SVG_NS,
    viewBox: `0 0 ${vb.width} ${vb.height}`,
    width: vb.width,
    height: vb.height,
    'data-hexsticker': 'true',
  });

  const contentScale = state.white_around_sticker ? WHITE_MARGIN_SCALE : 1;

  // -- defs ------------------------------------------------------------
  const defs = el('defs');
  svg.appendChild(defs);

  const clipId = `${idPrefix}-clip`;
  const clipPath = el('clipPath', { id: clipId });
  clipPath.appendChild(
    el('polygon', { points: hexPointsAttr(pxPerUnit, HEX_CENTER.x, HEX_CENTER.y, contentScale) })
  );
  defs.appendChild(clipPath);

  // -- 0. white-around-sticker background ring -------------------------
  if (state.white_around_sticker) {
    svg.appendChild(
      el('polygon', {
        points: hexPointsAttr(pxPerUnit, HEX_CENTER.x, HEX_CENTER.y, 1),
        fill: '#FFFFFF',
        stroke: 'none',
      })
    );
  }

  // -- 1. hex fill polygon ----------------------------------------------
  svg.appendChild(
    el('polygon', {
      points: hexPointsAttr(pxPerUnit, HEX_CENTER.x, HEX_CENTER.y, contentScale),
      fill: state.h_fill,
      stroke: 'none',
    })
  );

  // -- 2. spotlight overlay ------------------------------------------------
  if (state.spotlight) {
    const gradId = `${idPrefix}-spot`;
    const grad = el('radialGradient', {
      id: gradId,
      gradientUnits: 'userSpaceOnUse',
      cx: toSvg(state.l_x, state.l_y, pxPerUnit, contentScale).x,
      cy: toSvg(state.l_x, state.l_y, pxPerUnit, contentScale).y,
      r: 0.9 * contentScale * pxPerUnit,
    });
    grad.appendChild(el('stop', { offset: '0%', 'stop-color': '#FFFFFF', 'stop-opacity': state.l_alpha }));
    grad.appendChild(el('stop', { offset: '100%', 'stop-color': '#FFFFFF', 'stop-opacity': 0 }));
    defs.appendChild(grad);

    svg.appendChild(
      el('polygon', {
        points: hexPointsAttr(pxPerUnit, HEX_CENTER.x, HEX_CENTER.y, contentScale),
        fill: `url(#${gradId})`,
        stroke: 'none',
        'clip-path': `url(#${clipId})`,
      })
    );
  }

  // -- 3. subplot image --------------------------------------------------
  if (state.subplotImage) {
    const xmin = state.s_x - state.s_width / 2;
    const xmax = state.s_x + state.s_width / 2;
    const ymin = state.s_y - state.s_height / 2;
    const ymax = state.s_y + state.s_height / 2;
    const topLeft = toSvg(xmin, ymax, pxPerUnit, contentScale);
    const bottomRight = toSvg(xmax, ymin, pxPerUnit, contentScale);
    const w = bottomRight.x - topLeft.x;
    const h = bottomRight.y - topLeft.y;

    const group = el('g', { opacity: state.s_opacity });

    let subplotClipId = null;
    if (state.s_clip === 'hex') {
      subplotClipId = clipId;
    } else if (state.s_clip === 'circle') {
      subplotClipId = `${idPrefix}-subplot-circle`;
      const circleClip = el('clipPath', { id: subplotClipId });
      circleClip.appendChild(
        el('ellipse', {
          cx: topLeft.x + w / 2,
          cy: topLeft.y + h / 2,
          rx: w / 2,
          ry: h / 2,
        })
      );
      defs.appendChild(circleClip);
    }
    if (subplotClipId) group.setAttribute('clip-path', `url(#${subplotClipId})`);

    const image = el('image', {
      x: topLeft.x,
      y: topLeft.y,
      width: w,
      height: h,
      href: state.subplotImage,
      preserveAspectRatio: 'xMidYMid meet',
    });
    group.appendChild(image);
    svg.appendChild(group);
  }

  // -- 4. hex border polygon (on top of fill / spotlight / subplot) ------
  // An SVG stroke is centered on its path, but the fill polygon (and the
  // viewBox) hug the full hex outline -- so drawing the border at the same
  // radius as the fill would clip the OUTER half of the stroke at the
  // viewBox edge: corners look cut off and edge width looks uneven.
  //
  // Fix: inset the border polygon so the stroke's OUTER edge lands exactly
  // on the full hex outline. For a hexagon of vertex-radius r, the apothem
  // (center-to-edge distance) is a = r * sqrt(3) / 2. At the full content
  // radius c, a = c*sqrt(3)/2. Insetting the border polygon's edge by half
  // the stroke width d/2 must land back on that same apothem:
  //   (k*c)*sqrt(3)/2 + d/2 = c*sqrt(3)/2  =>  k = 1 - d/(c*sqrt(3))
  // The border polygon is then drawn at radius k*c. Using a miter join
  // (safe here: hexagon interior angles are 120 deg, well under the default
  // miterlimit) keeps the outer stroke boundary an exact hexagon, so there
  // is no clipping and the border width is uniform on every edge.
  const strokeWidthMm = state.h_size * STROKE_MM_PER_HSIZE;
  const strokeWidthDataUnits = mmToDataUnits(strokeWidthMm);
  const strokeWidthPx = strokeWidthDataUnits * pxPerUnit * contentScale;
  const borderInsetScale = 1 - strokeWidthDataUnits / (contentScale * SQRT3);
  svg.appendChild(
    el('polygon', {
      points: hexPointsAttr(pxPerUnit, HEX_CENTER.x, HEX_CENTER.y, borderInsetScale * contentScale),
      fill: 'none',
      stroke: state.h_color,
      'stroke-width': strokeWidthPx,
      'stroke-linejoin': 'miter',
    })
  );

  // -- 5. package text -----------------------------------------------------
  if (state.package) {
    const pos = toSvg(state.p_x, state.p_y, pxPerUnit, contentScale);
    const fontSizePx = mmToDataUnits(state.p_size) * TEXT_SCALE * pxPerUnit * contentScale;
    const { weight, style } = fontWeightStyle(state.p_fontface);
    svg.appendChild(
      el('text', {
        x: pos.x,
        y: pos.y,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        'font-family': resolveFontFamily(state.p_family),
        'font-size': fontSizePx,
        'font-weight': weight,
        'font-style': style,
        fill: state.p_color,
        'data-role': 'package-text',
      })
    ).textContent = state.package;
  }

  // -- 6. url text (rotated) -----------------------------------------------
  if (state.url) {
    const pos = toSvg(state.u_x, state.u_y, pxPerUnit, contentScale);
    const fontSizePx = mmToDataUnits(state.u_size) * TEXT_SCALE * pxPerUnit * contentScale;
    const { weight, style } = fontWeightStyle('plain');
    const text = el('text', {
      x: pos.x,
      y: pos.y,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      'font-family': resolveFontFamily(state.u_family),
      'font-size': fontSizePx,
      'font-weight': weight,
      'font-style': style,
      fill: state.u_color,
      transform: `rotate(${-state.u_angle} ${pos.x} ${pos.y})`,
      'data-role': 'url-text',
    });
    text.textContent = state.url;
    svg.appendChild(text);
  }

  return svg;
}

/** Serialize an <svg> element (from buildStickerSVG) to a standalone XML string. */
export function svgToString(svgEl) {
  const clone = svgEl.cloneNode(true);
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', SVG_NS);
  return new XMLSerializer().serializeToString(clone);
}
