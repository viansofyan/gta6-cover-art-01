// Neon Coast Cover Studio — render engine.
// One function, drawCover, paints a whole cover onto any 2d canvas at any
// size, so the live preview and the exported PNG are the same drawing.
// Panels are laid out from the layout name, each photo is cover-fit into
// its panel with its own zoom and pan, the active grade washes over the
// panels, and the lettering is drawn last so it always sits on top.

const COVER_SIZES = {
  square: { width: 1080, height: 1080, label: 'Square 1080 x 1080' },
  portrait: { width: 1080, height: 1350, label: 'Portrait 1080 x 1350' },
  wide: { width: 1920, height: 1080, label: 'Widescreen 1920 x 1080' },
};

function sizeById(id) {
  return COVER_SIZES[id] || COVER_SIZES.square;
}

// A tiny deterministic generator so the grain looks the same on every
// render of the same cover instead of flickering between preview frames.
function seededRandom(seed) {
  let value = seed >>> 0;
  return function next() {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

// Panel rectangles for each layout, in fractions of the cover size.
// The gap is a fraction of the shorter side so frames scale with the cover.
function panelRects(layout, width, height) {
  const gap = Math.round(Math.min(width, height) * 0.018);
  const outer = Math.round(Math.min(width, height) * 0.03);
  const innerW = width - outer * 2;
  const innerH = height - outer * 2;
  if (layout === 'hero') {
    const heroH = Math.round(innerH * 0.62);
    const smallH = innerH - heroH - gap;
    const smallW = Math.round((innerW - gap * 2) / 3);
    // The last column takes the exact remainder so the three panels plus
    // the two gaps always fill innerW: 3 * smallW + 2 * gap can drift by
    // up to 2px from innerW when smallW is rounded.
    const lastW = Math.max(1, innerW - (smallW + gap) * 2);
    return [
      { x: outer, y: outer, w: innerW, h: heroH, rotate: 0 },
      { x: outer, y: outer + heroH + gap, w: smallW, h: smallH, rotate: 0 },
      { x: outer + smallW + gap, y: outer + heroH + gap, w: smallW, h: smallH, rotate: 0 },
      { x: outer + (smallW + gap) * 2, y: outer + heroH + gap, w: lastW, h: smallH, rotate: 0 },
    ];
  }
  if (layout === 'single') {
    return [{ x: outer, y: outer, w: innerW, h: innerH, rotate: 0 }];
  }
  if (layout === 'snapshots') {
    const w = Math.round(innerW * 0.56);
    const h = Math.round(innerH * 0.56);
    return [
      { x: outer, y: outer, w, h, rotate: -0.055 },
      { x: outer + innerW - w, y: outer + Math.round(innerH * 0.08), w, h, rotate: 0.045 },
      { x: outer + Math.round(innerW * 0.06), y: outer + innerH - h, w, h, rotate: 0.04 },
      { x: outer + innerW - w - Math.round(innerW * 0.05), y: outer + innerH - h - Math.round(innerH * 0.04), w, h, rotate: -0.035 },
    ];
  }
  // grid: two by two poster grid. The right column and bottom row take
  // the exact remainder so 2 * halfW + gap always equals innerW (and the
  // same for height) instead of drifting by a pixel when halfW is rounded.
  const halfW = Math.round((innerW - gap) / 2);
  const halfH = Math.round((innerH - gap) / 2);
  const rightW = Math.max(1, innerW - halfW - gap);
  const bottomH = Math.max(1, innerH - halfH - gap);
  return [
    { x: outer, y: outer, w: halfW, h: halfH, rotate: 0 },
    { x: outer + halfW + gap, y: outer, w: rightW, h: halfH, rotate: 0 },
    { x: outer, y: outer + halfH + gap, w: halfW, h: bottomH, rotate: 0 },
    { x: outer + halfW + gap, y: outer + halfH + gap, w: rightW, h: bottomH, rotate: 0 },
  ];
}

// Cover-fit draw of one photo into a rectangle, honouring zoom and pan.
// panX and panY are 0..1 fractions of the spare room in each direction.
function drawPhotoInto(ctx, image, rect, zoom, panX, panY) {
  const scale = Math.max(rect.w / image.naturalWidth, rect.h / image.naturalHeight) * zoom;
  const drawnW = image.naturalWidth * scale;
  const drawnH = image.naturalHeight * scale;
  const spareX = drawnW - rect.w;
  const spareY = drawnH - rect.h;
  const dx = rect.x - spareX * panX;
  const dy = rect.y - spareY * panY;
  ctx.drawImage(image, dx, dy, drawnW, drawnH);
}

// One panel's photo painted into `ctx` at `rect`, or a dark placeholder
// with a hint when the panel has no photo yet.
function paintPanelPhoto(ctx, image, rect, panel) {
  if (image && image.naturalWidth > 0) {
    drawPhotoInto(ctx, image, rect, panel.zoom || 1, panel.panX ?? 0.5, panel.panY ?? 0.5);
  } else {
    const empty = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    empty.addColorStop(0, '#3a2a55');
    empty.addColorStop(1, '#1c1030');
    ctx.fillStyle = empty;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '600 ' + Math.round(Math.min(rect.w, rect.h) * 0.07) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Drop a photo here', rect.x + rect.w / 2, rect.y + rect.h / 2);
  }
}

// Duotone pass for the noir grade: grey the pixels of an offscreen canvas,
// then map dark to ink and light to paper. Runs on the offscreen canvas
// only, so the caller decides where the graded result lands.
function duotoneCanvas(octx, width, height, ink, paper) {
  const data = octx.getImageData(0, 0, width, height);
  const inkRgb = hexToRgb(ink);
  const paperRgb = hexToRgb(paper);
  const pixels = data.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const grey = (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114) / 255;
    pixels[i] = Math.round(inkRgb.r + (paperRgb.r - inkRgb.r) * grey);
    pixels[i + 1] = Math.round(inkRgb.g + (paperRgb.g - inkRgb.g) * grey);
    pixels[i + 2] = Math.round(inkRgb.b + (paperRgb.b - inkRgb.b) * grey);
  }
  octx.putImageData(data, 0, 0);
}

function paintGrade(ctx, rect, grade) {
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(1, grade.washBottom);
  ctx.save();
  ctx.globalAlpha = grade.washAlpha;
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = grade.tintAlpha * 2.2;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function paintGrain(ctx, width, height, amount, seed) {
  if (amount <= 0) return;
  const random = seededRandom(seed);
  const count = Math.round(width * height * amount * 0.0016);
  // Dot size scales with the shorter side so the grain reads the same on
  // a 1080 square and a 1920 wide export instead of vanishing at the
  // larger size (a fixed 1.4px dot is proportionally much smaller there).
  const dot = Math.max(1, (Math.min(width, height) / 1080) * 1.4);
  ctx.save();
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < count; i++) {
    const x = random() * width;
    const y = random() * height;
    ctx.globalAlpha = 0.05 + random() * 0.16;
    ctx.fillRect(x, y, dot, dot);
  }
  ctx.restore();
}

function paintVignette(ctx, width, height, strength) {
  const radius = Math.hypot(width, height) / 2;
  const shade = ctx.createRadialGradient(
    width / 2, height / 2, radius * 0.42,
    width / 2, height / 2, radius,
  );
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,' + strength.toFixed(2) + ')');
  ctx.save();
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function roundedRectPath(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// Bold poster title that shrinks until it fits, with a dark outline, a
// bright fill and a hot accent bar underneath.
function paintTitle(ctx, width, height, title, grade) {
  const margin = Math.round(width * 0.05);
  const maxWidth = width - margin * 2;
  let size = Math.round(Math.min(width, height) * 0.115);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const setFont = (s) => {
    ctx.font = '900 ' + s + 'px Impact, "Arial Black", "Helvetica Neue", sans-serif';
  };
  setFont(size);
  while (size > 18 && ctx.measureText(title).width > maxWidth) {
    size = Math.round(size * 0.92);
    setFont(size);
  }
  const y = height - Math.round(height * 0.055) - Math.round(size * 0.28);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, Math.round(size * 0.09));
  ctx.strokeStyle = '#12061c';
  ctx.strokeText(title, margin, y);
  const fill = ctx.createLinearGradient(margin, y - size, margin, y);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(1, '#ffd166');
  ctx.fillStyle = fill;
  ctx.fillText(title, margin, y);
  ctx.restore();
  // Accent bar under the title.
  const barY = y + Math.round(size * 0.16);
  const barW = Math.min(maxWidth, Math.round(ctx.measureText(title).width * 0.62));
  ctx.save();
  ctx.fillStyle = grade.washTop;
  ctx.fillRect(margin, barY, barW, Math.max(4, Math.round(size * 0.09)));
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(margin + barW, barY, Math.max(3, Math.round(size * 0.05)), Math.max(4, Math.round(size * 0.09)));
  ctx.restore();
  return { titleY: y, titleSize: size, margin };
}

// Glowing script-style subtitle, centred just above the title.
function paintSubtitle(ctx, width, height, subtitle, titleInfo) {
  if (!subtitle) return;
  let size = Math.round(Math.min(width, height) * 0.046);
  const maxWidth = width - Math.round(width * 0.05) * 2;
  const setFont = (s) => {
    ctx.font = 'italic 700 ' + s + 'px "Brush Script MT", "Segoe Script", cursive';
  };
  setFont(size);
  while (size > 14 && ctx.measureText(subtitle).width > maxWidth) {
    size = Math.round(size * 0.92);
    setFont(size);
  }
  ctx.save();
  setFont(size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = '#ff2ea6';
  ctx.shadowBlur = Math.round(size * 0.45);
  ctx.fillStyle = '#ffffff';
  const y = titleInfo.titleY - Math.round(titleInfo.titleSize * 1.22);
  ctx.fillText(subtitle, width / 2, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(subtitle, width / 2, y);
  ctx.restore();
}

// Rotated ribbon badge in the top corner.
function paintBadge(ctx, width, height, badge) {
  if (!badge) return;
  const size = Math.round(Math.min(width, height) * 0.038);
  ctx.save();
  ctx.font = '800 ' + size + 'px "Arial Black", "Helvetica Neue", sans-serif';
  const textW = ctx.measureText(badge).width;
  const padX = Math.round(size * 0.9);
  const padY = Math.round(size * 0.55);
  const boxW = textW + padX * 2;
  const boxH = size + padY * 2;
  ctx.translate(width - boxW / 2 - Math.round(width * 0.03), Math.round(height * 0.055));
  ctx.rotate(-0.06);
  ctx.fillStyle = '#ff2ea6';
  roundedRectPath(ctx, -boxW / 2, -boxH / 2, boxW, boxH, Math.round(boxH * 0.32));
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, Math.round(size * 0.08));
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, 0, Math.round(size * 0.06));
  ctx.restore();
}

// The whole cover. `state` holds layout, grade id, title, subtitle, badge
// and the panel list; `images` maps a photo id to a loaded HTMLImageElement.
// Panels with no photo yet get a dark placeholder with a hint.
function drawCover(ctx, width, height, state, images) {
  const grade = gradeById(state.grade);
  // Backdrop: deep dusk gradient so gaps and lettering zones read as sky.
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#1b0f3b');
  sky.addColorStop(0.55, '#7a1e5e');
  sky.addColorStop(1, '#ff7a3d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const rects = panelRects(state.layout, width, height);
  const frame = Math.round(Math.min(width, height) * 0.012);
  rects.forEach((rect, index) => {
    const panel = state.panels[index] || { photoId: null, zoom: 1, panX: 0.5, panY: 0.5 };
    ctx.save();
    if (rect.rotate) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rotate);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
    }
    // White snapshot frame, then the photo clipped inside it.
    ctx.fillStyle = '#fdf6ec';
    ctx.fillRect(rect.x - frame, rect.y - frame, rect.w + frame * 2, rect.h + frame * 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    const image = panel.photoId ? images[panel.photoId] : null;
    if (grade.duotone) {
      // Duotone in the panel's local (unrotated) coordinates: render the
      // photo onto an offscreen canvas, grade it there, then draw the
      // graded canvas inside the rotation transform and clip, so the
      // duotone stays aligned with the rotated photo. Sampling the main
      // canvas here would read the axis-aligned region, which for a
      // rotated panel includes backdrop and frame pixels outside the
      // photo, and paint it back misaligned.
      const off = document.createElement('canvas');
      off.width = Math.max(2, Math.round(rect.w));
      off.height = Math.max(2, Math.round(rect.h));
      const octx = off.getContext('2d');
      paintPanelPhoto(octx, image, { x: 0, y: 0, w: off.width, h: off.height }, panel);
      duotoneCanvas(octx, off.width, off.height, grade.duotoneInk, grade.duotonePaper);
      ctx.drawImage(off, rect.x, rect.y, rect.w, rect.h);
    } else {
      paintPanelPhoto(ctx, image, rect, panel);
    }
    paintGrade(ctx, rect, grade);
    ctx.restore();
    // Selected panel gets a bright outline so the editor can show it.
    if (state.selected === index && state.showSelection) {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = Math.max(3, Math.round(Math.min(width, height) * 0.008));
      ctx.strokeRect(rect.x - frame, rect.y - frame, rect.w + frame * 2, rect.h + frame * 2);
    }
    ctx.restore();
  });

  // Lettering sits over the lower band of the cover.
  const bandH = Math.round(height * 0.24);
  const band = ctx.createLinearGradient(0, height - bandH, 0, height);
  band.addColorStop(0, 'rgba(10,4,24,0)');
  band.addColorStop(1, 'rgba(10,4,24,0.72)');
  ctx.fillStyle = band;
  ctx.fillRect(0, height - bandH, width, bandH);

  const titleInfo = paintTitle(ctx, width, height, state.title || 'NEON COAST', grade);
  paintSubtitle(ctx, width, height, state.subtitle || '', titleInfo);
  paintBadge(ctx, width, height, state.badge || '');

  paintGrain(ctx, width, height, grade.grain, 20261120);
  paintVignette(ctx, width, height, grade.vignette);
}
