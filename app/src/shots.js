// Neon Coast Cover Studio — scene presets.
// Each scene is one screenshot: the file it lands in, the pixel size of
// that file, and the query string that sets the app up exactly that way.
// The app reads the same query strings, so a scene can be re-shot by
// opening the app with its query and capturing what it shows.

const SCENES = [
  {
    file: '1-cover.jpg',
    width: 1280,
    height: 720,
    query: '?photo=pier&title=NEON%20COAST&subtitle=where%20the%20night%20never%20ends&badge=VICE%20CITY&layout=hero&grade=neon&size=wide',
    label: 'Widescreen hero cover, neon night grade',
  },
  {
    file: '2-editor.jpg',
    width: 1280,
    height: 800,
    query: '?photo=boulevard&title=NEON%20COAST&subtitle=where%20the%20night%20never%20ends&badge=VICE%20CITY&layout=grid&grade=sunset&size=square',
    label: 'Editor view with a photo loaded',
  },
  {
    file: '3-cover.jpg',
    width: 1024,
    height: 1280,
    query: '?photo=neon&title=GOLDEN%20HOUR&subtitle=cruising%20down%20the%20boulevard&badge=SUNSET%20DRIVE&layout=grid&grade=golden&size=portrait',
    label: 'Portrait grid cover, golden hour grade',
  },
  {
    file: '4-cover.jpg',
    width: 1024,
    height: 1024,
    query: '?photo=boulevard&title=NEON%20COAST&subtitle=where%20the%20night%20never%20ends&badge=VICE%20CITY&layout=snapshots&grade=sunset&size=square',
    label: 'Square snapshots cover, sunset grade',
  },
];

function sceneByFile(file) {
  for (const scene of SCENES) {
    if (scene.file === file) return scene;
  }
  return null;
}
