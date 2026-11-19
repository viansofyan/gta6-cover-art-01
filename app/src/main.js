// Neon Coast Cover Studio — editor wiring.
// Owns the app state, the photo library, the undo history, the controls
// and the export. The preview canvas and the exported PNG are drawn by
// the same render engine, so what you see is what the file holds.

const SAMPLE_PHOTOS = [
  { id: 'boulevard', name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { id: 'neon', name: 'Neon Street', src: 'samples/neon.jpg' },
  { id: 'pier', name: 'Pier', src: 'samples/pier.jpg' },
];

const LAYOUTS = [
  { id: 'grid', label: 'Poster Grid' },
  { id: 'hero', label: 'Hero + Three' },
  { id: 'single', label: 'Full Bleed' },
  { id: 'snapshots', label: 'Snapshots' },
];

const MAX_HISTORY = 60;

let photos = [];
let images = {};
let state = null;
let undoStack = [];
let redoStack = [];
let previewCanvas = null;
let previewCtx = null;
let statusTimer = null;

function freshState() {
  return {
    layout: 'grid',
    grade: 'sunset',
    title: 'NEON COAST',
    subtitle: 'where the night never ends',
    badge: 'VICE CITY',
    size: 'square',
    selected: 0,
    showSelection: true,
    panels: [
      { photoId: 'boulevard', zoom: 1, panX: 0.5, panY: 0.5 },
      { photoId: 'neon', zoom: 1, panX: 0.5, panY: 0.5 },
      { photoId: 'pier', zoom: 1, panX: 0.5, panY: 0.5 },
      { photoId: 'boulevard', zoom: 1.3, panX: 0.35, panY: 0.5 },
    ],
  };
}

function snapshotState() {
  return JSON.stringify(state);
}

function restoreState(text) {
  state = JSON.parse(text);
  syncControls();
  renderPreview();
}

// A snapshot is taken BEFORE the change lands, so undo puts back the
// exact state the edit started from.
function pushHistory() {
  undoStack.push(snapshotState());
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
  updateUndoButtons();
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(snapshotState());
  restoreState(undoStack.pop());
  setStatus('Undid the last change.');
  updateUndoButtons();
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(snapshotState());
  restoreState(redoStack.pop());
  setStatus('Redid the change.');
  updateUndoButtons();
}

function updateUndoButtons() {
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  if (undoBtn) undoBtn.disabled = undoStack.length === 0;
  if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

function setStatus(message) {
  const line = document.getElementById('status-line');
  if (!line) return;
  line.textContent = message;
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    line.textContent = 'Ready. Pick a photo, a layout and a grade, then export.';
  }, 6000);
}

function loadImage(photo) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      images[photo.id] = image;
      resolve(true);
    };
    image.onerror = () => resolve(false);
    image.src = photo.src;
  });
}

async function addPhoto(photo) {
  photos.push(photo);
  await loadImage(photo);
  renderThumbnails();
  renderPreview();
}

function renderThumbnails() {
  const strip = document.getElementById('photo-strip');
  if (!strip) return;
  strip.innerHTML = '';
  photos.forEach((photo, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.title = photo.name + ' — click to put it in the selected panel';
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.name;
    button.appendChild(img);
    const caption = document.createElement('span');
    caption.textContent = photo.name;
    button.appendChild(caption);
    button.addEventListener('click', () => {
      pushHistory();
      state.panels[state.selected].photoId = photo.id;
      state.panels[state.selected].zoom = 1;
      state.panels[state.selected].panX = 0.5;
      state.panels[state.selected].panY = 0.5;
      renderPreview();
      setStatus(photo.name + ' is now in panel ' + (state.selected + 1) + '.');
    });
    strip.appendChild(button);
  });
}

function renderPreview() {
  if (!previewCanvas || !previewCtx) return;
  const size = sizeById(state.size);
  const maxSide = 640;
  const scale = Math.min(1, maxSide / Math.max(size.width, size.height));
  previewCanvas.width = Math.round(size.width * scale);
  previewCanvas.height = Math.round(size.height * scale);
  const view = Object.assign({}, state, { showSelection: true });
  drawCover(previewCtx, previewCanvas.width, previewCanvas.height, view, images);
  const label = document.getElementById('preview-size');
  if (label) label.textContent = size.label + ' — preview ' + previewCanvas.width + ' x ' + previewCanvas.height;
}

function syncControls() {
  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  };
  setValue('title-input', state.title);
  setValue('subtitle-input', state.subtitle);
  setValue('badge-input', state.badge);
  setValue('layout-select', state.layout);
  setValue('size-select', state.size);
  const panel = state.panels[state.selected];
  setValue('zoom-slider', panel.zoom);
  setValue('panx-slider', panel.panX);
  setValue('pany-slider', panel.panY);
  const chooser = document.getElementById('panel-photo');
  if (chooser) {
    chooser.innerHTML = '';
    photos.forEach((photo) => {
      const option = document.createElement('option');
      option.value = photo.id;
      option.textContent = photo.name;
      chooser.appendChild(option);
    });
    chooser.value = panel.photoId || '';
  }
  const panelLabel = document.getElementById('panel-label');
  if (panelLabel) panelLabel.textContent = 'Panel ' + (state.selected + 1) + ' of ' + state.panels.length;
  document.querySelectorAll('#grade-row button').forEach((button) => {
    button.classList.toggle('active', button.dataset.grade === state.grade);
  });
  document.querySelectorAll('#layout-row button').forEach((button) => {
    button.classList.toggle('active', button.dataset.layout === state.layout);
  });
  updateUndoButtons();
}

function fillAllPanels() {
  pushHistory();
  const photoId = state.panels[state.selected].photoId;
  if (!photoId) {
    setStatus('Pick a photo for the selected panel first.');
    return;
  }
  state.panels.forEach((panel) => {
    panel.photoId = photoId;
  });
  renderPreview();
  setStatus('Every panel now shows the same photo.');
}

function exportCover() {
  const size = sizeById(state.size);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  const view = Object.assign({}, state, { showSelection: false });
  drawCover(ctx, size.width, size.height, view, images);
  canvas.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — the browser could not make the PNG.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'neon-coast-cover-' + size.width + 'x' + size.height + '.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus('Saved ' + link.download + ' (' + size.width + ' x ' + size.height + ' PNG).');
  }, 'image/png');
}

// Clicking the preview picks the panel under the pointer.
function panelAtPoint(event) {
  const rect = previewCanvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const size = sizeById(state.size);
  const rects = panelRects(state.layout, size.width, size.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x / size.width && x <= (r.x + r.w) / size.width &&
        y >= r.y / size.height && y <= (r.y + r.h) / size.height) {
      return i;
    }
  }
  return -1;
}

function readFiles(fileList) {
  const files = Array.from(fileList || []).filter((file) => file.type.indexOf('image/') === 0);
  if (files.length === 0) {
    setStatus('That file is not an image — try a JPG or PNG photo.');
    return;
  }
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const photo = {
        id: 'upload-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
        name: file.name.replace(/\.[^.]+$/, '') || 'Uploaded photo',
        src: reader.result,
      };
      addPhoto(photo).then(() => {
        pushHistory();
        state.panels[state.selected].photoId = photo.id;
        renderPreview();
        setStatus(photo.name + ' added and put in panel ' + (state.selected + 1) + '.');
      });
    };
    reader.readAsDataURL(file);
  });
}

// Query string scene setup: ?photo=neon&title=...&subtitle=...&badge=...
// &layout=grid&grade=sunset&size=square — every parameter is optional.
function applySceneFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const photo = params.get('photo');
  if (photo) {
    const match = SAMPLE_PHOTOS.find((item) => item.id === photo);
    if (match) {
      state.panels.forEach((panel, index) => {
        panel.photoId = SAMPLE_PHOTOS[index % SAMPLE_PHOTOS.length].id;
      });
      state.panels[0].photoId = match.id;
    }
  }
  const title = params.get('title');
  if (title) state.title = title.toUpperCase();
  const subtitle = params.get('subtitle');
  if (subtitle !== null) state.subtitle = subtitle;
  const badge = params.get('badge');
  if (badge !== null) state.badge = badge.toUpperCase();
  const layout = params.get('layout');
  if (layout && LAYOUTS.some((item) => item.id === layout)) state.layout = layout;
  const grade = params.get('grade');
  if (grade && GRADES.some((item) => item.id === grade)) state.grade = grade;
  const size = params.get('size');
  if (size && COVER_SIZES[size]) state.size = size;
}

function buildGradeButtons() {
  const row = document.getElementById('grade-row');
  if (!row) return;
  GRADES.forEach((grade) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.grade = grade.id;
    button.textContent = grade.label;
    button.style.background = 'linear-gradient(135deg,' + grade.washTop + ',' + grade.washBottom + ')';
    button.addEventListener('click', () => {
      pushHistory();
      state.grade = grade.id;
      syncControls();
      renderPreview();
      setStatus('Grade: ' + grade.label + '.');
    });
    row.appendChild(button);
  });
}

function buildLayoutButtons() {
  const row = document.getElementById('layout-row');
  if (!row) return;
  LAYOUTS.forEach((layout) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.layout = layout.id;
    button.textContent = layout.label;
    button.addEventListener('click', () => {
      pushHistory();
      state.layout = layout.id;
      state.selected = 0;
      syncControls();
      renderPreview();
      setStatus('Layout: ' + layout.label + '.');
    });
    row.appendChild(button);
  });
}

function wireControls() {
  const bindText = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      state[key] = el.value;
      renderPreview();
    });
    el.addEventListener('change', () => {
      // History is pushed on focus so one typing run is one undo step.
      renderPreview();
    });
    el.addEventListener('focus', () => {
      el.dataset.before = state[key];
    });
    el.addEventListener('blur', () => {
      if (el.dataset.before !== state[key]) {
        undoStack.push(JSON.stringify(Object.assign({}, state, { [key]: el.dataset.before })));
        if (undoStack.length > MAX_HISTORY) undoStack.shift();
        redoStack = [];
        updateUndoButtons();
      }
    });
  };
  bindText('title-input', 'title');
  bindText('subtitle-input', 'subtitle');
  bindText('badge-input', 'badge');

  const layoutSelect = document.getElementById('layout-select');
  if (layoutSelect) {
    layoutSelect.addEventListener('change', () => {
      pushHistory();
      state.layout = layoutSelect.value;
      state.selected = 0;
      syncControls();
      renderPreview();
    });
  }
  const sizeSelect = document.getElementById('size-select');
  if (sizeSelect) {
    sizeSelect.addEventListener('change', () => {
      pushHistory();
      state.size = sizeSelect.value;
      renderPreview();
      setStatus('Export size: ' + sizeById(state.size).label + '.');
    });
  }
  const chooser = document.getElementById('panel-photo');
  if (chooser) {
    chooser.addEventListener('change', () => {
      pushHistory();
      state.panels[state.selected].photoId = chooser.value;
      renderPreview();
    });
  }
  const bindSlider = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      state.panels[state.selected][key] = parseFloat(el.value);
      renderPreview();
    });
    el.addEventListener('change', () => {
      // A finished drag is one undo step; the snapshot below is the
      // state before this slider moved, captured on first input.
      if (el.dataset.before !== undefined) {
        const before = JSON.parse(el.dataset.before);
        undoStack.push(JSON.stringify(before));
        if (undoStack.length > MAX_HISTORY) undoStack.shift();
        redoStack = [];
        updateUndoButtons();
        delete el.dataset.before;
      }
    });
    el.addEventListener('pointerdown', () => {
      el.dataset.before = snapshotState();
    });
  };
  bindSlider('zoom-slider', 'zoom');
  bindSlider('panx-slider', 'panX');
  bindSlider('pany-slider', 'panY');

  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      readFiles(fileInput.files);
      fileInput.value = '';
    });
  }
  const fillBtn = document.getElementById('fill-all-btn');
  if (fillBtn) fillBtn.addEventListener('click', fillAllPanels);
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) exportBtn.addEventListener('click', exportCover);
  const undoBtn = document.getElementById('undo-btn');
  if (undoBtn) undoBtn.addEventListener('click', undo);
  const redoBtn = document.getElementById('redo-btn');
  if (redoBtn) redoBtn.addEventListener('click', redo);

  if (previewCanvas) {
    previewCanvas.addEventListener('click', (event) => {
      const index = panelAtPoint(event);
      if (index >= 0) {
        state.selected = index;
        syncControls();
        renderPreview();
        setStatus('Panel ' + (index + 1) + ' selected — zoom and position it below.');
      }
    });
    previewCanvas.addEventListener('dragover', (event) => {
      event.preventDefault();
      previewCanvas.classList.add('drop-ready');
    });
    previewCanvas.addEventListener('dragleave', () => {
      previewCanvas.classList.remove('drop-ready');
    });
    previewCanvas.addEventListener('drop', (event) => {
      event.preventDefault();
      previewCanvas.classList.remove('drop-ready');
      readFiles(event.dataTransfer.files);
    });
  }
}

async function init() {
  state = freshState();
  previewCanvas = document.getElementById('preview-canvas');
  previewCtx = previewCanvas ? previewCanvas.getContext('2d') : null;
  applySceneFromQuery();
  buildGradeButtons();
  buildLayoutButtons();
  wireControls();
  for (const photo of SAMPLE_PHOTOS) {
    await addPhoto(photo);
  }
  syncControls();
  renderPreview();
  setStatus('Ready. Pick a photo, a layout and a grade, then export.');
}

document.addEventListener('DOMContentLoaded', init);
