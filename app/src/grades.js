// Neon Coast Cover Studio — colour grades.
// Each grade is a wash that sits over every panel: a sky gradient, a
// duotone tint, grain strength and vignette strength, plus the lettering
// accent colours the grade pairs with. All values are procedural; no
// external assets, no Rockstar artwork.
export const GRADES = {
  sunset: {
    label: 'Vice sunset',
    skyTop: '#2b1055',
    skyMid: '#e4487a',
    skyBottom: '#ff9a3d',
    tint: 'rgba(255, 90, 60, 0.16)',
    tintMode: 'overlay',
    grain: 0.10,
    vignette: 0.34,
    accent: '#ff5e3a',
    titleFill: '#fff7ec',
    titleStroke: '#1c0b2e',
    subGlow: '#ff7ad9',
  },
  neon: {
    label: 'Neon night',
    skyTop: '#05001f',
    skyMid: '#1b0f54',
    skyBottom: '#0a2e5e',
    tint: 'rgba(0, 229, 255, 0.14)',
    tintMode: 'screen',
    grain: 0.12,
    vignette: 0.42,
    accent: '#00e5ff',
    titleFill: '#eafcff',
    titleStroke: '#12003a',
    subGlow: '#ff2e88',
  },
  gold: {
    label: 'Golden hour',
    skyTop: '#3d1e00',
    skyMid: '#c96a1e',
    skyBottom: '#ffd166',
    tint: 'rgba(255, 190, 60, 0.18)',
    tintMode: 'soft-light',
    grain: 0.08,
    vignette: 0.30,
    accent: '#ffb703',
    titleFill: '#fffbe8',
    titleStroke: '#2a1500',
    subGlow: '#ff8c42',
  },
  noir: {
    label: 'Noir',
    skyTop: '#0b0b0e',
    skyMid: '#23232b',
    skyBottom: '#4a4a55',
    tint: 'rgba(255, 255, 255, 0.10)',
    tintMode: 'overlay',
    grain: 0.16,
    vignette: 0.55,
    accent: '#e8e8e8',
    titleFill: '#f5f5f5',
    titleStroke: '#000000',
    subGlow: '#b8b8ff',
  },
};

export const GRADE_IDS = Object.keys(GRADES);
