// Neon Coast Cover Studio — cover render engine.
// Draws the multi-panel poster onto any 2d canvas: layouts, cover-fit
// photos with per-panel crop, colour grades (wash + tint + grain +
// vignette) and the poster lettering. Pure canvas, no network, no fonts
// beyond the system stack.
import { GRADES } from './grades.js';

export const LAYOUTS = {
  grid: { label: 'Poster grid', panels: 4 },
  hero: { label: 'Hero + 3', panels: 4 },
  bleed: { label: 'Full bleed', panels: 1 },
  tilt: { label: 'Tilted snaps', panels: 4 },
};
export const LAYOUT_IDS = Object.keys(LAYOUTS);

// Panel rectangles for a layout, in fractions of the cover (x, y, w, h).
// Tilt panels overlap; each carries a rotation in degrees.
export function panelRects(layout, W, H) {
  const g = 0.012; // gap, as a fraction of the short side
  const gap = Math.min(W, H) * g;
  switch (layout) {
    case 'grid': {
      const cw = (W - gap * 3) / 2;
      const ch = (H - gap * 3) / 2;
      return [
        { x: gap, y: gap, w: cw, h: ch, rot: 0 },
        { x: gap * 2 + cw, y: gap, w: cw, h: ch, rot: 0 },
        { x: gap, y: gap * 2 + ch, w: cw, h: ch, rot: 0 },
        { x: gap * 2 + cw, y: gap * 2 + ch, w: cw, h: ch, rot: 0 },
      ];
    }
    case 'hero': {
      const rightW = W * 0.34 - gap * 1.5;
      const leftW = W - rightW - gap * 3;
      const rh = (H - gap * 4) / 3;
      return [
        { x: gap, y: gap, w: leftW, h: H - gap * 2, rot: 0 },
        { x: gap * 2 + leftW, y: gap, w: rightW, h: rh, rot: 0 },
        { x: gap * 2 + leftW, y: gap * 2 + rh, w: rightW, h: rh, rot: 0 },
        { x: gap * 2 + leftW, y: gap * 3 + rh * 2, w: rightW, h: rh, rot: 0 },
      ];
    }
    case 'bleed':
      return [{ x: 0, y: 0, w: W, h: H, rot: 0 }];
    case 'tilt': {
      const pw = W * 0.46;
      const ph = H * 0.42;
      return [
        { x: W * 0.03, y: H * 0.04, w: pw, h: ph, rot: -4 },
        { x: W * 0.51, y: H * 0.02, w: pw, h: ph, rot: 3 },
        { x: W * 0.06, y: H * 0.52, w: pw, h: ph, rot: 3.5 },
        { x: W * 0.48, y: H * 0.54, w: pw, h: ph, rot: -3 },
      ];
    }
    default:
      return panelRects('grid', W, H);
  }
}

// Deterministic pseudo-random generator (mulberry32) so grain is stable
// for a given seed — exported PNGs must be byte-stable across runs.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const img = g.createImageData(128, 128);
  const r = rng(20261119);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(r() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

// Draw one photo into a rect with cover-fit + zoom + pan.
// crop: { zoom: 1..3, x: 0..1, y: 0..1 } — x/y are the focal point.
export function drawPhotoInto(ctx, img, rect, crop) {
  const zoom = crop?.zoom ?? 1;
  const fx = crop?.x ?? 0.5;
  const fy = crop?.y ?? 0.5;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const s = base * zoom;
  const dw = iw * s;
  const dh = ih * s;
  // Focal point stays put while zooming: offset so (fx, fy) of the image
  // lands at the same fraction of the rect.
  const dx = rect.x + (rect.w - dw) * fx;
  const dy = rect.y + (rect.h - dh) * fy;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function applyGrade(ctx, rect, grade) {
  // Sky wash: vertical gradient, stronger at the top of the panel.
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, grade.skyTop + 'cc');
  wash.addColorStop(0.55, grade.skyMid + '59');
  wash.addColorStop(1, grade.skyBottom + '40');
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  // Duotone tint.
  ctx.globalCompositeOperation = grade.tintMode;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  // Film grain, tiled.
  if (grade.grain > 0) {
    ctx.save();
    ctx.globalAlpha = grade.grain;
    const tile = getGrainTile();
    const pat = ctx.createPattern(tile, 'repeat');
    ctx.fillStyle = pat;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }
  // Vignette.
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const r = Math.hypot(rect.w, rect.h) / 2;
  const vig = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, `rgba(0,0,0,${grade.vignette})`);
  ctx.fillStyle = vig;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

// Fit a font size so `text` fits `maxW` at `startSize`, never below `min`.
function fitFont(ctx, text, startSize, maxW, weight, family, min = 10) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > min && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function drawLettering(ctx, state, W, H) {
  const grade = GRADES[state.grade];
  const family = `'Arial Black', 'Helvetica Neue', Arial, sans-serif`;
  const scriptFamily = `'Segoe Script', 'Brush Script MT', cursive`;
  const margin = W * 0.045;

  // Bottom title block: accent bar + outlined auto-fitted title.
  const title = (state.title || 'NEON COAST').toUpperCase();
  const titleSize = fitFont(ctx, title, Math.round(H * 0.115), W - margin * 2, '900', family);
  const titleY = H - H * 0.175; // baseline — kept clear of the bottom edge
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 ${titleSize}px ${family}`;
  // Soft drop shadow for legibility over photos.
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = Math.round(titleSize * 0.12);
  ctx.shadowOffsetY = Math.round(titleSize * 0.04);
  ctx.lineWidth = Math.max(2, Math.round(titleSize * 0.14));
  ctx.strokeStyle = grade.titleStroke;
  ctx.lineJoin = 'round';
  ctx.strokeText(title, margin, titleY);
  ctx.fillStyle = grade.titleFill;
  ctx.fillText(title, margin, titleY);
  ctx.restore();

  // Accent bar above the title.
  ctx.fillStyle = grade.accent;
  ctx.fillRect(margin, titleY - titleSize - Math.round(H * 0.018), Math.round(W * 0.16), Math.round(H * 0.012));

  // Neon-script subtitle, glowing, under the title.
  const sub = state.subtitle || '';
  if (sub) {
    const subSize = fitFont(ctx, sub, Math.round(H * 0.052), W - margin * 2, '700', scriptFamily);
    ctx.save();
    ctx.font = `700 ${subSize}px ${scriptFamily}`;
    ctx.textBaseline = 'top';
    ctx.shadowColor = grade.subGlow;
    ctx.shadowBlur = Math.round(subSize * 0.55);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sub, margin, titleY + Math.round(H * 0.018));
    ctx.restore();
  }

  // Rotated badge ribbon, top right.
  const badge = (state.badge || '').trim();
  if (badge) {
    const bSize = Math.round(H * 0.038);
    const ang = 0.10;
    ctx.save();
    ctx.font = `900 ${bSize}px ${family}`;
    const bw = ctx.measureText(badge).width + bSize * 1.6;
    const bh = bSize * 1.9;
    // Rotated bounding box, so the whole ribbon stays inside the cover.
    const hw = (bw / 2) * Math.cos(ang) + (bh / 2) * Math.sin(ang);
    const hh = (bh / 2) * Math.cos(ang) + (bw / 2) * Math.sin(ang);
    ctx.translate(W - hw - Math.round(W * 0.01), hh + Math.round(H * 0.008));
    ctx.rotate(ang);
    ctx.fillStyle = grade.accent;
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(1, bSize * 0.06);
    ctx.strokeRect(-bw / 2 + 3, -bh / 2 + 3, bw - 6, bh - 6);
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, 0, 1);
    ctx.restore();
  }
}

// The main entry: draw the whole cover for `state` onto `ctx` at W×H.
// state: { layout, grade, title, subtitle, badge, photos: [{img}], panels: [{photo, zoom, x, y}] }
export function drawCover(ctx, state, W, H) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  // Base: grade sky so gaps and tilt background read as poster, not black.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.55, grade.skyMid);
  sky.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const rects = panelRects(state.layout, W, H);
  const frame = Math.round(Math.min(W, H) * 0.012);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] ?? { photo: i, zoom: 1, x: 0.5, y: 0.5 };
    const photo = state.photos[panel.photo];
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((rect.rot * Math.PI) / 180);
      ctx.translate(-rect.w / 2, -rect.h / 2);
    } else {
      ctx.translate(rect.x, rect.y);
    }
    const local = { x: 0, y: 0, w: rect.w, h: rect.h };
    // White snapshot frame for the tilt layout.
    if (state.layout === 'tilt') {
      ctx.fillStyle = '#fdfdf8';
      ctx.fillRect(-frame, -frame, rect.w + frame * 2, rect.h + frame * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(-frame + 3, rect.h + frame - 2, rect.w + frame * 2 - 6, 4);
    }
    ctx.beginPath();
    ctx.rect(local.x, local.y, local.w, local.h);
    ctx.clip();
    if (photo?.img) {
      drawPhotoInto(ctx, photo.img, local, panel);
    } else {
      // Empty panel: flat grade wash so the layout still reads.
      ctx.fillStyle = grade.skyMid;
      ctx.fillRect(local.x, local.y, local.w, local.h);
    }
    applyGrade(ctx, local, grade);
    ctx.restore();
  });

  // Lettering sits over everything, with a subtle bottom scrim so the
  // title stays legible on bright photos.
  const scrim = ctx.createLinearGradient(0, H * 0.68, 0, H);
  scrim.addColorStop(0, 'rgba(0,0,0,0)');
  scrim.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * 0.68, W, H * 0.32);
  drawLettering(ctx, state, W, H);
}
