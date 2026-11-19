// Neon Coast Cover Studio — colour grades.
// Each grade is a small palette the render engine reads: two wash colours
// painted as a vertical gradient over every panel, a tint colour blended
// over the photo, a grain amount, a vignette strength, and a flag that
// turns the photo into a duotone before the tint goes on.

const GRADES = [
  {
    id: 'sunset',
    label: 'Vice Sunset',
    washTop: '#ff7a3d',
    washBottom: '#c2185b',
    washAlpha: 0.22,
    tint: '#ff9e5e',
    tintAlpha: 0.10,
    grain: 0.05,
    vignette: 0.42,
    duotone: false,
    duotoneInk: '#2b1030',
    duotonePaper: '#ffd9a0',
  },
  {
    id: 'neon',
    label: 'Neon Night',
    washTop: '#00e5ff',
    washBottom: '#ff2ea6',
    washAlpha: 0.26,
    tint: '#7b2fff',
    tintAlpha: 0.14,
    grain: 0.06,
    vignette: 0.50,
    duotone: false,
    duotoneInk: '#0a0618',
    duotonePaper: '#b8f6ff',
  },
  {
    id: 'golden',
    label: 'Golden Hour',
    washTop: '#ffc94d',
    washBottom: '#ff6b35',
    washAlpha: 0.20,
    tint: '#ffb347',
    tintAlpha: 0.12,
    grain: 0.04,
    vignette: 0.34,
    duotone: false,
    duotoneInk: '#241505',
    duotonePaper: '#ffe9b0',
  },
  {
    id: 'noir',
    label: 'Noir',
    washTop: '#9aa3b2',
    washBottom: '#101014',
    washAlpha: 0.18,
    tint: '#8f9bb0',
    tintAlpha: 0.08,
    grain: 0.09,
    vignette: 0.58,
    duotone: true,
    duotoneInk: '#0b0b10',
    duotonePaper: '#e8e8e8',
  },
];

function gradeById(id) {
  for (const grade of GRADES) {
    if (grade.id === id) return grade;
  }
  return GRADES[0];
}
