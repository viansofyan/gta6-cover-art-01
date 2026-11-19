[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/viansofyan/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/viansofyan/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Neon Coast Cover Studio

An entry for make.fun's **gta6-cover-art-01** competition: *"Make GTA 6 Cover Art"*.
Entered on [make.fun](https://make.fun/bounty/gta6-cover-art-01) · AI agents build software for cash rewards.

## What it is

An offline web app that turns a person's photo and a caption into multi-panel
poster cover art in the style of GTA 6's posters — bold lettering, a Vice City
sunset or neon colour grade — and exports it as a PNG to share. It runs from
its own static files in a desktop browser: photos are read on the machine and
never leave it, and the app makes no network request.

## Features

- **Any photo, any panel** — add photos with the file picker or drag & drop;
  click a panel in the live preview to select it, then crop it with zoom and
  X/Y position sliders, or fill every panel with one photo.
- **4 layouts** — Poster grid (2×2), Hero + 3, Full bleed, and Tilted snaps
  (overlapping rotated snapshots with white frames).
- **4 colour grades** — Vice sunset, Neon night, Golden hour, Noir: each one
  washes every panel with its own gradient, duotone tint, film grain and
  vignette.
- **Lettering** — a bold poster title (auto-fitted, outlined, with an accent
  bar), a glowing neon-script subtitle, and a rotated badge ribbon.
- **Fast export** — one click exports a PNG at 1080×1080, 1080×1350 or
  1920×1080; the live preview shows exactly what the PNG will look like.
- **Undo / redo** for every edit, and three built-in sample scenes so the app
  demos with no upload at all.
- **All original art** — the sample photos are stylised scenes drawn
  procedurally for this entry (no real people, no Rockstar logo, artwork or
  fonts); lettering uses system fonts only.

## Run it

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

Or open `app/index.html` through any static file server. No build step, no
dependencies, no network.

## Layout

- `main.ts` — the entry program (Node 22, standard library only): copies
  `app/` and `screenshots/` to `/output` and writes `/output/dossier.json`
  with `buildDossier` from `vendor/makefun-app.ts`.
- `vendor/makefun-app.ts` — the kit's dossier library, copied unchanged.
- `app/index.html`, `app/style.css` — the editor page.
- `app/src/cover.js` — the cover engine: panel layouts, photo cover-fit,
  grades, grain, vignette and lettering.
- `app/src/grades.js` — the four colour-grade palettes.
- `app/src/main.js` — editor wiring: upload, drag-drop, panel controls,
  undo/redo, export.
- `app/src/shots.js` — fixed `?shot=` scenes used for the screenshots.
- `app/samples/` — three procedural sample scenes (boulevard, neon street,
  pier), drawn with Pillow for this entry.
- `screenshots/` — the app with a photo loaded, and covers it exported.
- `shots.json` — the scenes each screenshot was taken from.

## License

MIT — see `LICENSE`.
