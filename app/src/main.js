// Neon Coast Cover Studio — editor wiring.
// Upload + drag & drop, layout/grade switching, per-panel crop, lettering,
// undo/redo (snapshots taken BEFORE each edit), PNG export at three sizes,
// and the deterministic ?shot= scenes used by the screenshot pipeline.
import { GRADES, GRADE_IDS } from './grades.js';
import { LAYOUTS, LAYOUT_IDS, panelRects, drawCover } from './cover.js';
import { parseShotQuery, orderedSamples } from './shots.js';

const $ = (sel) => document.querySelector(sel);
const SAMPLES = ['boulevard', 'neon', 'pier'];
const MAX_HISTORY = 60;
const EXPORT_SIZES = ['1080x1080', '1080x1350', '1920x1080'];

const state = {
  layout: 'grid',
  grade: 'sunset',
  title: 'NEON COAST',
  subtitle: 'Vice City nights',
  badge: 'GTA VI',
  photos: [], // { name, img }
  panels: [0, 1, 2, 3].map((i) => ({ photo: i, zoom: 1, x: 0.5, y: 0.5 })),
  selected: 0,
};

let history = [];
let future = [];
let previewScale = 1;

function snapshot() {
  return JSON.stringify({
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    badge: state.badge,
    panels: state.panels,
    selected: state.selected,
  });
}

function restore(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  state.panels = s.panels.map((p) => ({ ...p }));
  syncControls();
  render();
}

// Snapshot BEFORE the edit; identical snapshots are dropped so undo
// only steps through real changes.
function pushHistory() {
  const snap = snapshot();
  if (history.length && history[history.length - 1] === snap) return;
  history.push(snap);
  if (history.length > MAX_HISTORY) history.shift();
  future = [];
  updateUndoButtons();
}

function undo() {
  if (!history.length) return;
  future.push(snapshot());
  restore(history.pop());
  updateUndoButtons();
}

function redo() {
  if (!future.length) return;
  history.push(snapshot());
  restore(future.pop());
  updateUndoButtons();
}

function updateUndoButtons() {
  $('#undoBtn').disabled = history.length === 0;
  $('#redoBtn').disabled = future.length === 0;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamples(order) {
  const names = orderedSamples(order, SAMPLES);
  for (const name of names) {
    if (state.photos.some((p) => p.name === name)) continue;
    try {
      const img = await loadImage(`samples/${name}.jpg`);
      state.photos.push({ name, img });
    } catch {
      // A missing sample must not kill the app; the panel stays empty.
    }
  }
}

function panelCount() {
  return LAYOUTS[state.layout].panels;
}

function render() {
  const canvas = $('#preview');
  const wrap = canvas.parentElement;
  const availW = Math.min(wrap.clientWidth, 760);
  const availH = Math.min(window.innerHeight - 40, 760);
  const [w, h] = currentExportSize();
  const scale = Math.min(availW / w, availH / h, 1);
  previewScale = scale;
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  drawCover(ctx, state, w, h);
  renderThumbs();
  renderPanelOutline();
}

function currentExportSize() {
  const sel = $('#exportSize').value;
  const [w, h] = sel.split('x').map(Number);
  return [w, h];
}

function renderThumbs() {
  const box = $('#thumbs');
  box.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const b = document.createElement('button');
    b.className = 'thumb';
    b.type = 'button';
    b.title = photo.name;
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    b.appendChild(img);
    b.addEventListener('click', () => {
      pushHistory();
      state.panels[state.selected].photo = i;
      syncControls();
      render();
    });
    box.appendChild(b);
  });
}

function renderPanelOutline() {
  const [w, h] = currentExportSize();
  const rects = panelRects(state.layout, w, h);
  const overlay = $('#panelOverlay');
  overlay.innerHTML = '';
  rects.forEach((r, i) => {
    const d = document.createElement('div');
    d.className = 'panel-outline' + (i === state.selected ? ' selected' : '');
    d.style.left = `${(r.x / w) * 100}%`;
    d.style.top = `${(r.y / h) * 100}%`;
    d.style.width = `${(r.w / w) * 100}%`;
    d.style.height = `${(r.h / h) * 100}%`;
    d.style.transform = r.rot ? `rotate(${r.rot}deg)` : '';
    d.textContent = String(i + 1);
    d.addEventListener('click', (ev) => {
      ev.stopPropagation();
      state.selected = i;
      syncControls();
      render();
    });
    overlay.appendChild(d);
  });
  $('#panelLabel').textContent = `Panel ${state.selected + 1} of ${panelCount()}`;
}

function syncControls() {
  document.querySelectorAll('#layoutBtns button').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('#gradeBtns button').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  $('#titleInput').value = state.title;
  $('#subtitleInput').value = state.subtitle;
  $('#badgeInput').value = state.badge;
  const panel = state.panels[state.selected];
  const sel = $('#panelPhoto');
  sel.innerHTML = '';
  state.photos.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = p.name;
    sel.appendChild(o);
  });
  sel.value = String(panel.photo);
  $('#zoomRange').value = String(panel.zoom);
  $('#xRange').value = String(panel.x);
  $('#yRange').value = String(panel.y);
  $('#zoomVal').textContent = `${panel.zoom.toFixed(1)}×`;
  $('#xVal').textContent = `${Math.round(panel.x * 100)}%`;
  $('#yVal').textContent = `${Math.round(panel.y * 100)}%`;
}

function setStatus(msg) {
  $('#status').textContent = msg;
}

async function addFiles(files) {
  const images = [...files].filter((f) => f.type.startsWith('image/'));
  if (!images.length) {
    setStatus('No image files in that drop.');
    return;
  }
  for (const file of images) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      state.photos.push({ name: file.name.replace(/\.[^.]+$/, ''), img });
    } catch {
      setStatus(`Could not read ${file.name}.`);
    }
  }
  render();
  setStatus(`${images.length} photo${images.length > 1 ? 's' : ''} added — click a thumbnail to place it.`);
}

function exportPNG(size) {
  const [w, h] = size.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  drawCover(off.getContext('2d'), state, w, h);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neon-coast-cover-${size}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus(`Saved neon-coast-cover-${size}.png (${w}×${h}).`);
      resolve(blob);
    }, 'image/png');
  });
}

// Test hook: the screenshot pipeline and the kit's finalist review use
// these to render and export without clicking.
window.__cover = {
  state,
  render,
  exportDataURL(size) {
    const [w, h] = size.split('x').map(Number);
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    drawCover(off.getContext('2d'), state, w, h);
    return off.toDataURL('image/png');
  },
  ready: null,
};

function wireControls() {
  // Layout + grade buttons.
  LAYOUT_IDS.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = id;
    b.textContent = LAYOUTS[id].label;
    b.addEventListener('click', () => {
      pushHistory();
      state.layout = id;
      state.selected = 0;
      syncControls();
      render();
    });
    $('#layoutBtns').appendChild(b);
  });
  GRADE_IDS.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = id;
    b.textContent = GRADES[id].label;
    b.addEventListener('click', () => {
      pushHistory();
      state.grade = id;
      syncControls();
      render();
    });
    $('#gradeBtns').appendChild(b);
  });
  EXPORT_SIZES.forEach((s) => {
    const o = document.createElement('option');
    o.value = s;
    o.textContent = `${s.replace('x', ' × ')} px`;
    $('#exportSize').appendChild(o);
  });

  // Lettering: snapshot on focus (before the edit), commit on input.
  for (const [inputId, key] of [['#titleInput', 'title'], ['#subtitleInput', 'subtitle'], ['#badgeInput', 'badge']]) {
    const el = $(inputId);
    el.addEventListener('focus', pushHistory);
    el.addEventListener('input', () => {
      state[key] = el.value;
      render();
    });
  }

  // Panel controls: snapshot on pointerdown (before the drag), live update.
  const panel = () => state.panels[state.selected];
  $('#panelPhoto').addEventListener('change', (ev) => {
    pushHistory();
    panel().photo = Number(ev.target.value);
    render();
  });
  for (const [id, key, fmt] of [
    ['#zoomRange', 'zoom', (v) => `${v.toFixed(1)}×`],
    ['#xRange', 'x', (v) => `${Math.round(v * 100)}%`],
    ['#yRange', 'y', (v) => `${Math.round(v * 100)}%`],
  ]) {
    const el = $(id);
    el.addEventListener('pointerdown', pushHistory);
    el.addEventListener('input', () => {
      panel()[key] = Number(el.value);
      $(id.replace('Range', 'Val')).textContent = fmt(panel()[key]);
      render();
    });
  }
  $('#fillAllBtn').addEventListener('click', () => {
    pushHistory();
    const photo = panel().photo;
    state.panels.forEach((p) => { p.photo = photo; });
    render();
    setStatus('Every panel now uses the selected photo.');
  });

  $('#undoBtn').addEventListener('click', undo);
  $('#redoBtn').addEventListener('click', redo);
  $('#exportBtn').addEventListener('click', () => exportPNG($('#exportSize').value));
  $('#exportSize').addEventListener('change', render);

  // Upload: file picker + drag & drop onto the preview.
  $('#fileInput').addEventListener('change', (ev) => {
    addFiles(ev.target.files);
    ev.target.value = '';
  });
  const stage = $('#stage');
  ['dragenter', 'dragover'].forEach((evt) => stage.addEventListener(evt, (ev) => {
    ev.preventDefault();
    stage.classList.add('dropping');
  }));
  ['dragleave', 'drop'].forEach((evt) => stage.addEventListener(evt, (ev) => {
    ev.preventDefault();
    stage.classList.remove('dropping');
  }));
  stage.addEventListener('drop', (ev) => addFiles(ev.dataTransfer.files));
  stage.addEventListener('click', (ev) => {
    if (ev.target.id === 'preview') {
      // Clicking the bare canvas cycles the selected panel.
      state.selected = (state.selected + 1) % panelCount();
      syncControls();
      render();
    }
  });

  window.addEventListener('resize', render);
}

async function boot() {
  const shot = parseShotQuery(window.location.search);
  wireControls();
  await loadSamples(shot.photo);
  // Deterministic scene: requested photo first, then the other samples
  // cycle through the panels; caption/lettering/layout/grade from query.
  const order = orderedSamples(shot.photo, SAMPLES);
  state.panels.forEach((p, i) => {
    p.photo = state.photos.findIndex((ph) => ph.name === order[i % order.length]);
    if (p.photo < 0) p.photo = 0;
    p.zoom = 1; p.x = 0.5; p.y = 0.5;
  });
  state.title = shot.caption.toUpperCase();
  state.subtitle = shot.subtitle;
  state.badge = shot.badge;
  state.layout = LAYOUTS[shot.layout] ? shot.layout : 'grid';
  state.grade = GRADES[shot.grade] ? shot.grade : 'sunset';
  syncControls();
  updateUndoButtons();

  if (shot.shot === 'cover') {
    // Screenshot mode: hide the editor, render the cover full-bleed.
    document.body.classList.add('shot-cover');
    const [w, h] = shot.size.split('x').map(Number);
    const canvas = $('#preview');
    canvas.width = w; canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawCover(ctx, state, w, h);
    window.__cover.ready = Promise.resolve(true);
  } else {
    render();
    window.__cover.ready = Promise.resolve(true);
  }
  setStatus(shot.shot === 'cover' ? 'Cover rendered.' : 'Ready — drop photos or pick the samples.');
}

boot();
