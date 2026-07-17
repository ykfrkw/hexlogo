// main.js
// Wires the DOM controls to state.js, re-renders the preview (sticker.js)
// and R-code panel (rcode.js) on every change, and drives preset/variant
// galleries plus PNG/SVG export (render.js).

import { store, defaultState } from './state.js';
import { buildStickerSVG } from './sticker.js';
import { PRESETS, applyPreset, renderThumbnail, generateColorVariants } from './presets.js';
import { toRCode } from './rcode.js';
import { FONT_LIST } from './fonts.js';
import { exportPNG, exportSVG, exportAllSizes, allExportSizes, triggerDownload, triggerTextDownload } from './render.js';

const PREVIEW_PX_PER_UNIT = 360;
const THUMB_PX_PER_UNIT = 48;

const previewContainer = document.getElementById('preview-svg-container');
const dropZone = document.getElementById('preview-drop-zone');
const presetGallery = document.getElementById('preset-gallery');
const variantGallery = document.getElementById('variant-gallery');
const generateVariantsBtn = document.getElementById('generate-variants-btn');
const rCodeOutput = document.getElementById('r-code-output');
const copyRCodeBtn = document.getElementById('copy-rcode-btn');
const copyStatus = document.getElementById('copy-status');
const imageUpload = document.getElementById('image-upload');
const clearImageBtn = document.getElementById('clear-image-btn');
const exportStatus = document.getElementById('export-status');
const exportSvgBtn = document.getElementById('export-svg-btn');
const exportAllBtn = document.getElementById('export-all-btn');

// ---------------------------------------------------------------------------
// Font <select> population
// ---------------------------------------------------------------------------

function familyToSelectId(value) {
  if (!value) return FONT_LIST[0].id;
  const byId = FONT_LIST.find((f) => f.id === value);
  if (byId) return byId.id;
  const byGoogleName = FONT_LIST.find((f) => f.googleFont.toLowerCase() === String(value).toLowerCase());
  if (byGoogleName) return byGoogleName.id;
  if (String(value).toLowerCase().startsWith('aller')) return FONT_LIST[0].id;
  return FONT_LIST[0].id;
}

function populateFontSelects() {
  document.querySelectorAll('select[data-role="font-select"]').forEach((select) => {
    select.innerHTML = '';
    for (const font of FONT_LIST) {
      const opt = document.createElement('option');
      opt.value = font.id;
      opt.textContent = font.label;
      opt.style.fontFamily = font.value;
      select.appendChild(opt);
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
// Preview + R code rendering
// ---------------------------------------------------------------------------

function renderPreview(state) {
  previewContainer.innerHTML = '';
  const svg = buildStickerSVG(state, { pxPerUnit: PREVIEW_PX_PER_UNIT });
  previewContainer.appendChild(svg);
}

function renderRCode(state) {
  rCodeOutput.textContent = toRCode(state);
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
      makeThumbButton(preset.name, state, () => store.replace(state))
    );
  }
}

function renderVariantGallery() {
  variantGallery.innerHTML = '';
  const variants = generateColorVariants(store.state, 6);
  for (const variant of variants) {
    variantGallery.appendChild(
      makeThumbButton(variant.name, variant.state, () => store.replace(variant.state))
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
    store.update({ subplotImage: reader.result, subplotImageName: file.name });
  };
  reader.readAsDataURL(file);
}

function setupImageInput() {
  imageUpload.addEventListener('change', () => {
    if (imageUpload.files && imageUpload.files[0]) loadImageFile(imageUpload.files[0]);
  });

  clearImageBtn.addEventListener('click', () => {
    store.update({ subplotImage: null, subplotImageName: '' });
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
// Export
// ---------------------------------------------------------------------------

function baseFileName(state) {
  const trimmed = (state.package || 'hexsticker').trim();
  const safe = trimmed.replace(/[^A-Za-z0-9_.-]/g, '_');
  return safe.length ? safe : 'hexsticker';
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
// R code copy button
// ---------------------------------------------------------------------------

function setupCopyButton() {
  copyRCodeBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(rCodeOutput.textContent);
      copyStatus.textContent = 'Copied!';
    } catch (err) {
      copyStatus.textContent = 'Copy failed (select and copy manually).';
    }
    setTimeout(() => {
      copyStatus.textContent = '';
    }, 1800);
  });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function main() {
  populateFontSelects();
  const controls = setupControls();
  setupImageInput();
  setupExportButtons();
  setupCopyButton();

  generateVariantsBtn.addEventListener('click', renderVariantGallery);

  renderPresetGallery();

  store.subscribe((state) => {
    refreshControls(controls, state);
    renderPreview(state);
    renderRCode(state);
  });

  // Initial render.
  store.replace(defaultState());
}

main();
