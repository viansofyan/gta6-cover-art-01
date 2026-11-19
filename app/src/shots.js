// Neon Coast Cover Studio — deterministic ?shot= scenes.
// ?shot=cover  renders a finished cover at the requested size (for the
//               screenshot pipeline: ?shot=cover&photo=neon&caption=...
//               &subtitle=...&layout=tilt&grade=neon&size=1920x1080)
// ?shot=editor renders the full editor UI with a scene applied.
// Query params: photo (sample name), caption, subtitle, badge, layout,
// grade, size (WxH). Panels cycle the sample photos, requested one first.
export const SHOT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export function parseShotQuery(search) {
  const q = new URLSearchParams(search);
  const size = SHOT_SIZES[q.get('size')] ? q.get('size') : '1080x1080';
  return {
    shot: q.get('shot') || '',
    photo: q.get('photo') || 'boulevard',
    caption: q.get('caption') || 'Neon Coast',
    subtitle: q.get('subtitle') || 'Vice City nights',
    badge: q.get('badge') || 'GTA VI',
    layout: q.get('layout') || 'grid',
    grade: q.get('grade') || 'sunset',
    size,
  };
}

// Order the sample names so the requested photo is first, then the rest
// in fixed order — multi-panel covers show several photos, not one photo
// repeated in every panel.
export function orderedSamples(requested, all) {
  const rest = all.filter((n) => n !== requested);
  return [requested, ...rest];
}
