// cropmodal.js
// Wires up the "Crop image" <dialog> (markup lives in index.html): loads the
// original uploaded image onto a canvas at native resolution, lets the user
// drag out / move / resize a free-aspect selection rectangle (mouse or
// touch, via Pointer Events), and reports the result back to main.js as a
// crop rect normalized to the image's natural pixel size (0..1 fractions).
//
// This module owns only the modal's *interaction* -- it has no knowledge of
// app state; main.js supplies onApply/onReset callbacks and decides what to
// do with the resulting rect.

const HANDLE_HIT_CSS_PX = 14; // generous hit radius for grabbing a corner
const HANDLE_DRAW_CSS_PX = 10; // visual dot diameter (matches spec)
const MIN_SELECTION_CSS_PX = 4; // drags shorter than this are treated as "no selection"

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cropmodal: failed to load image'));
    img.src = src;
  });
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function cornerPoints(rect) {
  return [
    { name: 'nw', x: rect.x, y: rect.y },
    { name: 'ne', x: rect.x + rect.w, y: rect.y },
    { name: 'sw', x: rect.x, y: rect.y + rect.h },
    { name: 'se', x: rect.x + rect.w, y: rect.y + rect.h },
  ];
}

function oppositeCorner(rect, handleName) {
  switch (handleName) {
    case 'nw':
      return { x: rect.x + rect.w, y: rect.y + rect.h };
    case 'ne':
      return { x: rect.x, y: rect.y + rect.h };
    case 'sw':
      return { x: rect.x + rect.w, y: rect.y };
    case 'se':
    default:
      return { x: rect.x, y: rect.y };
  }
}

function rectFromPoints(p1, p2) {
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const w = Math.abs(p2.x - p1.x);
  const h = Math.abs(p2.y - p1.y);
  return { x, y, w, h };
}

const HANDLE_CURSORS = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' };

/**
 * @param {object} deps
 * @param {(rect: {x:number,y:number,w:number,h:number}|null) => void} deps.onApply
 * @param {() => void} deps.onReset
 */
export function initCropModal({ onApply, onReset }) {
  const dialogEl = document.getElementById('crop-modal');
  const canvasEl = document.getElementById('crop-canvas');
  const applyBtn = document.getElementById('crop-apply-btn');
  const resetBtn = document.getElementById('crop-reset-btn');
  const cancelBtn = document.getElementById('crop-cancel-btn');
  const ctx = canvasEl.getContext('2d');

  let sourceImg = null;
  let naturalW = 0;
  let naturalH = 0;
  /** Selection rect in canvas-buffer (== natural image) pixel coordinates, or null. */
  let rect = null;

  let dragMode = null; // null | 'create' | 'move' | 'resize'
  let dragHandle = null; // corner name when dragMode === 'resize'
  let dragAnchor = null; // fixed point (buffer coords) drags are measured against
  let rectAtDragStart = null;
  let rafPending = false;

  function scale() {
    const r = canvasEl.getBoundingClientRect();
    return r.width ? canvasEl.width / r.width : 1;
  }

  function toBufferPoint(e) {
    const r = canvasEl.getBoundingClientRect();
    const s = r.width ? canvasEl.width / r.width : 1;
    const sy = r.height ? canvasEl.height / r.height : 1;
    return {
      x: clamp((e.clientX - r.left) * s, 0, canvasEl.width),
      y: clamp((e.clientY - r.top) * sy, 0, canvasEl.height),
    };
  }

  function pointInRect(p, rc) {
    return p.x >= rc.x && p.x <= rc.x + rc.w && p.y >= rc.y && p.y <= rc.y + rc.h;
  }

  function hitTestHandle(p) {
    if (!rect) return null;
    const hitR = HANDLE_HIT_CSS_PX * scale();
    for (const c of cornerPoints(rect)) {
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      if (Math.sqrt(dx * dx + dy * dy) <= hitR) return c.name;
    }
    return null;
  }

  function scheduleRedraw() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      redraw();
    });
  }

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function redraw() {
    if (!sourceImg) return;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.drawImage(sourceImg, 0, 0, canvasEl.width, canvasEl.height);

    if (!rect) return;
    const s = scale();

    // Dim everything outside the selection (four bands around it).
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, canvasEl.width, rect.y); // top
    ctx.fillRect(0, rect.y + rect.h, canvasEl.width, canvasEl.height - (rect.y + rect.h)); // bottom
    ctx.fillRect(0, rect.y, rect.x, rect.h); // left
    ctx.fillRect(rect.x + rect.w, rect.y, canvasEl.width - (rect.x + rect.w), rect.h); // right

    const primary = cssVar('--primary', '#18181b');
    const bg = cssVar('--background', '#ffffff');

    ctx.strokeStyle = primary;
    ctx.lineWidth = Math.max(1, 1.5 * s);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

    const handleR = (HANDLE_DRAW_CSS_PX / 2) * s;
    for (const c of cornerPoints(rect)) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, handleR, 0, Math.PI * 2);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.strokeStyle = primary;
      ctx.stroke();
    }
  }

  function updateHoverCursor(e) {
    if (dragMode) return;
    const p = toBufferPoint(e);
    const handle = hitTestHandle(p);
    if (handle) {
      canvasEl.style.cursor = HANDLE_CURSORS[handle];
    } else if (rect && pointInRect(p, rect)) {
      canvasEl.style.cursor = 'move';
    } else {
      canvasEl.style.cursor = 'crosshair';
    }
  }

  function onPointerDown(e) {
    e.preventDefault();
    const p = toBufferPoint(e);
    const handle = hitTestHandle(p);
    if (handle) {
      dragMode = 'resize';
      dragHandle = handle;
      rectAtDragStart = { ...rect };
    } else if (rect && pointInRect(p, rect)) {
      dragMode = 'move';
      dragAnchor = p;
      rectAtDragStart = { ...rect };
    } else {
      dragMode = 'create';
      dragAnchor = p;
      rect = { x: p.x, y: p.y, w: 0, h: 0 };
    }
    try {
      canvasEl.setPointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
    scheduleRedraw();
  }

  function onPointerMove(e) {
    if (!dragMode) {
      updateHoverCursor(e);
      return;
    }
    e.preventDefault();
    const p = toBufferPoint(e);

    if (dragMode === 'create') {
      rect = rectFromPoints(dragAnchor, p);
    } else if (dragMode === 'move') {
      const dx = p.x - dragAnchor.x;
      const dy = p.y - dragAnchor.y;
      const w = rectAtDragStart.w;
      const h = rectAtDragStart.h;
      const x = clamp(rectAtDragStart.x + dx, 0, canvasEl.width - w);
      const y = clamp(rectAtDragStart.y + dy, 0, canvasEl.height - h);
      rect = { x, y, w, h };
    } else if (dragMode === 'resize') {
      const anchor = oppositeCorner(rectAtDragStart, dragHandle);
      rect = rectFromPoints(anchor, p);
    }
    scheduleRedraw();
  }

  function onPointerUp(e) {
    if (!dragMode) return;
    dragMode = null;
    dragHandle = null;
    dragAnchor = null;
    rectAtDragStart = null;
    try {
      canvasEl.releasePointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
    if (rect) {
      const s = scale();
      const minPx = MIN_SELECTION_CSS_PX * s;
      if (rect.w < minPx || rect.h < minPx) rect = null;
    }
    scheduleRedraw();
  }

  canvasEl.addEventListener('pointerdown', onPointerDown);
  canvasEl.addEventListener('pointermove', onPointerMove);
  canvasEl.addEventListener('pointerup', onPointerUp);
  canvasEl.addEventListener('pointercancel', onPointerUp);

  applyBtn.addEventListener('click', () => {
    const normalized = rect
      ? {
          x: rect.x / naturalW,
          y: rect.y / naturalH,
          w: rect.w / naturalW,
          h: rect.h / naturalH,
        }
      : null;
    onApply(normalized);
    dialogEl.close();
  });

  resetBtn.addEventListener('click', () => {
    rect = null;
    onReset();
    dialogEl.close();
  });

  cancelBtn.addEventListener('click', () => {
    dialogEl.close();
  });

  // Click on the backdrop (the <dialog> element itself receives the click
  // when the click lands outside the card, per the ::backdrop hit-testing
  // quirk of <dialog>) dismisses like Cancel.
  dialogEl.addEventListener('click', (e) => {
    if (e.target === dialogEl) dialogEl.close();
  });

  return {
    /**
     * Open the modal for `originalDataUrl`, seeding the selection from
     * `currentCropRect` (normalized 0..1 fractions, or null for "no crop").
     */
    async open(originalDataUrl, currentCropRect) {
      sourceImg = await loadImage(originalDataUrl);
      naturalW = sourceImg.naturalWidth || sourceImg.width;
      naturalH = sourceImg.naturalHeight || sourceImg.height;
      canvasEl.width = naturalW;
      canvasEl.height = naturalH;

      rect = currentCropRect
        ? {
            x: currentCropRect.x * naturalW,
            y: currentCropRect.y * naturalH,
            w: currentCropRect.w * naturalW,
            h: currentCropRect.h * naturalH,
          }
        : null;

      dialogEl.showModal();
      redraw();
    },
  };
}
