// geometry.js
// Pure geometry / unit-conversion helpers for the hex sticker coordinate system.
//
// We draw a POINTY-TOP hexagon centred at data coordinates (1, 1) with
// "radius" 1 (vertex-to-center distance), in a y-up Cartesian data space
// (y increases UPWARDS, matching most charting/plotting conventions). No DOM
// access happens in this module.

export const SQRT3 = Math.sqrt(3);

// ---------------------------------------------------------------------------
// Hexagon vertices (data space), pointy-top.
// Order: left-upper, left-lower, bottom-point, right-lower, right-upper, top-point.
// ---------------------------------------------------------------------------
export const HEX_CENTER = { x: 1, y: 1 };

export function hexVertices(cx = HEX_CENTER.x, cy = HEX_CENTER.y, r = 1) {
  const dx = [-SQRT3 / 2, -SQRT3 / 2, 0, SQRT3 / 2, SQRT3 / 2, 0];
  const dy = [0.5, -0.5, -1, -0.5, 0.5, 1];
  return dx.map((ddx, i) => [cx + ddx * r, cy + dy[i] * r]);
}

// ---------------------------------------------------------------------------
// Data-space bounding box of the hexagon (r = 1, centered at (1,1)).
// x in [1 - sqrt(3)/2, 1 + sqrt(3)/2]  (width = sqrt(3))
// y in [0, 2]                          (height = 2)
// ---------------------------------------------------------------------------
export const DATA_XMIN = HEX_CENTER.x - SQRT3 / 2;
export const DATA_XMAX = HEX_CENTER.x + SQRT3 / 2;
export const DATA_YMIN = 0;
export const DATA_YMAX = 2;
export const DATA_WIDTH = DATA_XMAX - DATA_XMIN; // sqrt(3) ~ 1.7320508
export const DATA_HEIGHT = DATA_YMAX - DATA_YMIN; // 2

// ---------------------------------------------------------------------------
// Physical dimensions. The canonical output is a "2 inch" hex:
// 43.9mm across the flats (x) by 50.8mm point-to-point (y).
// We keep a UNIFORM scale of 1 data unit = 1 inch = 25.4mm on both axes, so
// the hex is exactly 2 data units tall -> 50.8mm tall. The width then comes
// out to sqrt(3) * 25.4 = 43.9994mm, matching the documented 43.9mm value.
// ---------------------------------------------------------------------------
export const MM_PER_DATA_UNIT = 25.4; // 1 data unit == 1 inch
export const STANDARD_STICKER_MM = { width: 43.9, height: 50.8 };

// ---------------------------------------------------------------------------
// mm / inch / dpi conversion helpers
// ---------------------------------------------------------------------------
export function mmToInches(mm) {
  return mm / 25.4;
}

export function inchesToMm(inches) {
  return inches * 25.4;
}

export function mmToPx(mm, dpi) {
  return (mm / 25.4) * dpi;
}

export function pxToMm(px, dpi) {
  return (px / dpi) * 25.4;
}

export function dataUnitsToMm(units) {
  return units * MM_PER_DATA_UNIT;
}

export function mmToDataUnits(mm) {
  return mm / MM_PER_DATA_UNIT;
}

// Standard hex pixel size at a given dpi, based on the 43.9 x 50.8mm spec.
export function standardStickerPx(dpi) {
  return {
    width: mmToPx(STANDARD_STICKER_MM.width, dpi),
    height: mmToPx(STANDARD_STICKER_MM.height, dpi),
  };
}

// ---------------------------------------------------------------------------
// Data-space -> SVG pixel-space transform.
//
// SVG's y-axis points DOWN; our data space's y points UP. We flip y around
// DATA_YMAX and shift x by DATA_XMIN so the hex bounding box maps to an SVG
// viewBox starting at (0,0).
//
//   svgX = (dataX - DATA_XMIN) * pxPerUnit
//   svgY = (DATA_YMAX - dataY) * pxPerUnit
// ---------------------------------------------------------------------------
export function dataToSvg(x, y, pxPerUnit) {
  return {
    x: (x - DATA_XMIN) * pxPerUnit,
    y: (DATA_YMAX - y) * pxPerUnit,
  };
}

// Convenience: full viewBox dimensions (in px) for a given px-per-data-unit scale.
export function viewBoxSize(pxPerUnit) {
  return {
    width: DATA_WIDTH * pxPerUnit,
    height: DATA_HEIGHT * pxPerUnit,
  };
}

// Build an SVG "points" attribute string from an array of [x, y] data-space
// vertices, transformed into SVG pixel space at the given scale.
export function hexPointsAttr(pxPerUnit, cx = HEX_CENTER.x, cy = HEX_CENTER.y, r = 1) {
  return hexVertices(cx, cy, r)
    .map(([x, y]) => {
      const p = dataToSvg(x, y, pxPerUnit);
      return `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
    })
    .join(' ');
}
