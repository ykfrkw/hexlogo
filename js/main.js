// main.js
// Wires the DOM controls to state.js, re-renders the preview (sticker.js)
// on every change, and drives preset/variant galleries plus PNG/SVG export
// (render.js).

import { store, defaultState } from './state.js';
import { buildStickerSVG } from './sticker.js';
import { PRESETS, applyPreset, renderThumbnail, generateColorVariants } from './presets.js';
import { FONT_LIST, DEFAULT_FONT_ID } from './fonts.js';
import { exportPNG, exportSVG, exportAllSizes, allExportSizes, triggerDownload, triggerTextDownload } from './render.js';
import { processSubplot } from './imagetools.js';
import { initCropModal } from './cropmodal.js';

const PREVIEW_PX_PER_UNIT = 360;
const THUMB_PX_PER_UNIT = 48;

const previewContainer = document.getElementById('preview-svg-container');
const dropZone = document.getElementById('preview-drop-zone');
const presetGallery = document.getElementById('preset-gallery');
const variantGallery = document.getElementById('variant-gallery');
const generateVariantsBtn = document.getElementById('generate-variants-btn');
const imageUpload = document.getElementById('image-upload');
const clearImageBtn = document.getElementById('clear-image-btn');
const cropImageBtn = document.getElementById('crop-image-btn');
const whiteThresholdRow = document.getElementById('white-threshold-row');
const exportStatus = document.getElementById('export-status');
const exportSvgBtn = document.getElementById('export-svg-btn');
const exportAllBtn = document.getElementById('export-all-btn');

// ---------------------------------------------------------------------------
// Font <select> population
// ---------------------------------------------------------------------------

function familyToSelectId(value) {
  if (!value) return DEFAULT_FONT_ID;
  const byId = FONT_LIST.find((f) => f.id === value);
  if (byId) return byId.id;
  const byGoogleName = FONT_LIST.find((f) => f.googleFont.toLowerCase() === String(value).toLowerCase());
  if (byGoogleName) return byGoogleName.id;
  return DEFAULT_FONT_ID;
}

function populateFontSelects() {
  document.querySelectorAll('select[data-role="font-select"]').forEach((select) => {
    select.innerHTML = '';
    const groups = new Map();
    for (const font of FONT_LIST) {
      let group = groups.get(font.group);
      if (!group) {
        group = document.createElement('optgroup');
        group.label = font.group;
        groups.set(font.group, group);
        select.appendChild(group);
      }
      const opt = document.createElement('option');
      opt.value = font.id;
      opt.textContent = font.label;
      opt.style.fontFamily = font.value;
      group.appendChild(opt);
    }
  });
}

// ---------------------------------------------------------------------------
// Generic control binding: every input/select with [data-key] is synced
// two-way with store.state, keyed by its `data-key` attribute.
// ---------------------------------------------------------------------------

function readControlValue(el) {
  const role = el.dataset.role;
  switch (role) {
    case 'checkbox':
      return el.checked;
    case 'range':
    case 'number': {
      const n = parseFloat(el.value);
      return Number.isNaN(n) ? 0 : n;
    }
    case 'font-select':
      return el.value; // font id, resolved by fonts.js
    default:
      return el.value;
  }
}

function writeControlValue(el, state) {
  const key = el.dataset.key;
  const role = el.dataset.role;
  const value = state[key];
  switch (role) {
    case 'checkbox':
      el.checked = !!value;
      break;
    case 'font-select':
      el.value = familyToSelectId(value);
      break;
    case 'range':
    case 'number':
      if (document.activeElement !== el) el.value = value;
      break;
    default:
      if (document.activeElement !== el) el.value = value ?? '';
  }
}

function setupControls() {
  const controls = document.querySelectorAll('[data-key]');
  controls.forEach((el) => {
    const key = el.dataset.key;
    const eventName = el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'color' || el.type === 'file' ? 'change' : 'input';
    el.addEventListener(eventName, () => {
      store.update({ [key]: readControlValue(el) });
    });
  });
  return controls;
}

function refreshControls(controls, state) {
  controls.forEach((el) => writeControlValue(el, state));
}

// ---------------------------------------------------------------------------
// Subplot original/processed fallback: presets (and any other incoming
// state) may set subplotImage directly without subplotOriginal. Treat
// subplotImage as the original in that case, so crop / white-transparent
// still work on preset images.
// ---------------------------------------------------------------------------

function normalizeIncomingState(state) {
  if (state.subplotImage && !state.subplotOriginal) {
    return { ...state, subplotOriginal: state.subplotImage };
  }
  return state;
}

// ---------------------------------------------------------------------------
// Preview + R code rendering
// ---------------------------------------------------------------------------

function renderPreview(state) {
  previewContainer.innerHTML = '';
  const svg = buildStickerSVG(state, { pxPerUnit: PREVIEW_PX_PER_UNIT });
  previewContainer.appendChild(svg);
}

// ---------------------------------------------------------------------------
// Preset / colour-variant galleries
// ---------------------------------------------------------------------------

function makeThumbButton(label, state, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'thumb-btn';
  btn.appendChild(renderThumbnail(state, { pxPerUnit: THUMB_PX_PER_UNIT }));
  const labelEl = document.createElement('span');
  labelEl.className = 'thumb-label';
  labelEl.textContent = label;
  btn.appendChild(labelEl);
  btn.addEventListener('click', onClick);
  return btn;
}

function renderPresetGallery() {
  presetGallery.innerHTML = '';
  for (const preset of PRESETS) {
    const state = applyPreset(preset);
    presetGallery.appendChild(
      makeThumbButton(preset.name, state, () => store.replace(normalizeIncomingState(state)))
    );
  }
}

function renderVariantGallery() {
  variantGallery.innerHTML = '';
  const variants = generateColorVariants(store.state, 6);
  for (const variant of variants) {
    variantGallery.appendChild(
      makeThumbButton(variant.name, variant.state, () => store.replace(normalizeIncomingState(variant.state)))
    );
  }
}

// ---------------------------------------------------------------------------
// Image upload / drag & drop
// ---------------------------------------------------------------------------

function loadImageFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    // Set subplotOriginal (the source of truth for the pipeline) and
    // subplotImage as an immediate placeholder (same data) so the preview
    // updates instantly; the reactive pipeline below reprocesses it (crop /
    // white-transparent) right after. A fresh upload always starts uncropped.
    store.update({
      subplotOriginal: reader.result,
      subplotImage: reader.result,
      subplotImageName: file.name,
      s_cropRect: null,
    });
  };
  reader.readAsDataURL(file);
}

function setupImageInput() {
  imageUpload.addEventListener('change', () => {
    if (imageUpload.files && imageUpload.files[0]) loadImageFile(imageUpload.files[0]);
  });

  clearImageBtn.addEventListener('click', () => {
    store.update({
      subplotImage: null,
      subplotOriginal: null,
      subplotImageName: '',
      s_cropRect: null,
      s_whiteTransparent: false,
      s_whiteThreshold: defaultState().s_whiteThreshold,
    });
    imageUpload.value = '';
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
  });
  ['dragleave', 'dragend'].forEach((evt) => {
    dropZone.addEventListener(evt, () => dropZone.classList.remove('drag-over'));
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadImageFile(file);
  });
}

// ---------------------------------------------------------------------------
// Non-destructive subplot pipeline: whenever subplotOriginal or any of the
// crop / white-transparent params change, reprocess in the background and
// write the result into subplotImage (the field sticker.js/render.js
// consume). Debounced ~80ms so dragging the threshold slider stays smooth;
// a sequence token guards against out-of-order async results clobbering a
// newer one.
// ---------------------------------------------------------------------------

let subplotProcessKey = null;
let subplotDebounceTimer = null;
let subplotSeq = 0;

function subplotParamsKey(state) {
  return JSON.stringify({
    o: state.subplotOriginal,
    c: state.s_cropRect,
    wt: state.s_whiteTransparent,
    th: state.s_whiteThreshold,
  });
}

async function runSubplotProcessing(state) {
  const seq = ++subplotSeq;
  // Nothing to do: pass the original through untouched, so vector (SVG)
  // subplots keep full quality instead of being rasterized needlessly.
  if (!state.s_cropRect && !state.s_whiteTransparent) {
    if (state.subplotImage !== state.subplotOriginal) {
      store.update({ subplotImage: state.subplotOriginal });
    }
    return;
  }
  try {
    const dataUrl = await processSubplot(state.subplotOriginal, {
      cropRect: state.s_cropRect,
      whiteTransparent: state.s_whiteTransparent,
      whiteThreshold: state.s_whiteThreshold,
    });
    if (seq !== subplotSeq) return; // a newer request has since started
    store.update({ subplotImage: dataUrl });
  } catch (err) {
    console.error('[hexlogo] subplot processing failed', err);
  }
}

function scheduleSubplotProcessing(state) {
  if (!state.subplotOriginal) {
    subplotProcessKey = null;
    if (subplotDebounceTimer) {
      clearTimeout(subplotDebounceTimer);
      subplotDebounceTimer = null;
    }
    return;
  }
  const key = subplotParamsKey(state);
  if (key === subplotProcessKey) return;
  subplotProcessKey = key;
  if (subplotDebounceTimer) clearTimeout(subplotDebounceTimer);
  subplotDebounceTimer = setTimeout(() => {
    subplotDebounceTimer = null;
    runSubplotProcessing(store.state);
  }, 80);
}

// ---------------------------------------------------------------------------
// Crop modal
// ---------------------------------------------------------------------------

function setupCropModal() {
  const cropModal = initCropModal({
    onApply: (rect) => store.update({ s_cropRect: rect }),
    onReset: () => store.update({ s_cropRect: null }),
  });

  cropImageBtn.addEventListener('click', () => {
    if (!store.state.subplotOriginal) return;
    cropModal.open(store.state.subplotOriginal, store.state.s_cropRect);
  });
}

function refreshSubplotControls(state) {
  const hasImage = !!(state.subplotOriginal || state.subplotImage);
  cropImageBtn.disabled = !hasImage;
  whiteThresholdRow.hidden = !state.s_whiteTransparent;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function baseFileName(state) {
  const trimmed = (state.package || 'hexlogo').trim();
  const safe = trimmed.replace(/[^A-Za-z0-9_.-]/g, '_');
  return safe.length ? safe : 'hexlogo';
}

function setExportStatus(msg) {
  exportStatus.textContent = msg;
}

function setupExportButtons() {
  document.querySelectorAll('.export-btn[data-size-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const sizeId = btn.dataset.sizeId;
      const size = allExportSizes().find((s) => s.id === sizeId);
      setExportStatus(`Exporting ${size ? size.label : sizeId}...`);
      try {
        const blob = await exportPNG(store.state, size.widthPx);
        const name = `${baseFileName(store.state)}-${size.label.replace(/\s+/g, '')}.png`;
        triggerDownload(blob, name);
        setExportStatus(`Saved ${name}`);
      } catch (err) {
        console.error(err);
        setExportStatus(`Export failed: ${err.message}`);
      }
    });
  });

  exportSvgBtn.addEventListener('click', async () => {
    setExportStatus('Exporting SVG...');
    try {
      const svgString = await exportSVG(store.state);
      const name = `${baseFileName(store.state)}.svg`;
      triggerTextDownload(svgString, name);
      setExportStatus(`Saved ${name}`);
    } catch (err) {
      console.error(err);
      setExportStatus(`Export failed: ${err.message}`);
    }
  });

  exportAllBtn.addEventListener('click', async () => {
    setExportStatus('Exporting all sizes...');
    try {
      await exportAllSizes(store.state, baseFileName(store.state));
      setExportStatus('All sizes exported.');
    } catch (err) {
      console.error(err);
      setExportStatus(`Export failed: ${err.message}`);
    }
  });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function main() {
  populateFontSelects();
  const controls = setupControls();
  setupImageInput();
  setupCropModal();
  setupExportButtons();

  generateVariantsBtn.addEventListener('click', renderVariantGallery);

  renderPresetGallery();

  store.subscribe((state) => {
    refreshControls(controls, state);
    refreshSubplotControls(state);
    renderPreview(state);
    scheduleSubplotProcessing(state);
  });

  // Initial render.
  store.replace(normalizeIncomingState(defaultState()));
}

main();
