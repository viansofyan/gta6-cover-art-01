# Neon Coast Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/viansofyan/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/viansofyan/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

An offline web app that turns a person's photo and a caption into
multi-panel poster cover art in the style of a big open-world game's
loading screens and posters — a Vice City neon-sunset look — and exports
it as a PNG to share. It was built for the make.fun competition
**Make GTA 6 Cover Art** (`gta6-cover-art-01`).

Everything runs locally in the browser: static files, no build step, no
network requests, system fonts only. Photos are read on your own machine
and never uploaded. All artwork, lettering and colour grades are
original — no game logos, artwork or fonts anywhere.

## How it works

1. **Add photos** — pick files from your machine, drag them onto the
   preview, or use the three bundled sample photos.
2. **Pick a layout** — a two-by-two poster grid, a large hero panel plus
   three smaller panels, a single full-bleed photo, or tilted overlapping
   snapshots with white frames.
3. **Crop each panel** — click a panel in the live preview to select it,
   then zoom it (1× to 3×) and slide it left, right, up or down. A
   per-panel chooser picks which photo a panel shows, and one button
   fills every panel with the selected photo.
4. **Write the lettering** — a bold poster title that shrinks to fit,
   with an outline and an accent bar; a glowing script subtitle; a
   rotated ribbon badge. All three are editable text fields.
5. **Choose a colour grade** — Vice Sunset, Neon Night, Golden Hour or
   Noir. Each grade washes the panels in its own gradient, adds a
   duotone tint where it fits, film grain and a vignette.
6. **Export** — one click downloads a PNG at 1080 × 1080, 1080 × 1350 or
   1920 × 1080. The live preview shows exactly what the exported PNG
   will look like, and a status line confirms the save.

Undo and redo go at least sixty steps deep, and every snapshot is taken
before the edit it guards, so undo genuinely reverts the last change.

## Running it

Serve the `app/` directory with any static file server and open
`index.html` in a desktop browser:

```sh
node serve.ts
```

Then open `http://localhost:8080/` in your browser. No install step and
no network connection are needed.

To hand the entry in, run the entry program (Node 22, standard library
only). It copies `app/` and `screenshots/` into the output directory
and writes `dossier.json` there:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Without `MAKEFUN_OUTPUT_DIR` set, the output directory is `/output`.

## Scene URLs

The app reads a query string that pre-configures a scene, so a cover
can be reproduced exactly from a link. Every parameter is optional:

| Parameter | Meaning |
| --- | --- |
| `photo` | Sample photo to lead with: `boulevard`, `neon` or `pier` |
| `title` | Poster title text |
| `subtitle` | Subtitle text |
| `badge` | Ribbon badge text |
| `layout` | `grid`, `hero`, `single` or `snapshots` |
| `grade` | `sunset`, `neon`, `golden` or `noir` |
| `size` | Export size: `square`, `portrait` or `wide` |

Example — a widescreen neon hero cover:

```
index.html?photo=pier&title=NEON%20COAST&subtitle=where%20the%20night%20never%20ends&badge=VICE%20CITY&layout=hero&grade=neon&size=wide
```

The four scenes in `shots.json` use these parameters, one per
screenshot in `screenshots/`.

## Files

- `main.ts` — entry program: copies the app and screenshots and writes
  the dossier.
- `serve.ts` — tiny local static file server for testing.
- `app/index.html` — the app page.
- `app/style.css` — all of the app's styling.
- `app/src/cover.js` — the render engine: layouts, cover-fit cropping,
  grades, grain, vignette and lettering.
- `app/src/grades.js` — the four colour-grade palettes.
- `app/src/main.js` — editor wiring: photos, panels, undo, export and
  scene setup from the query string.
- `app/src/shots.js` — the four screenshot scene presets.
- `app/samples/` — three bundled sample photos.
- `screenshots/` — four JPEG screenshots of the app and its covers.
- `shots.json` — one entry per screenshot: file, pixel size and query.

## Licence

MIT — see `LICENSE`.
