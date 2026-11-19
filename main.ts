// Neon Coast Cover Studio — entry program.
// Copies app/ and screenshots/ from beside this file into the output
// directory and writes dossier.json there with the vendored builder.
// The output directory comes from MAKEFUN_OUTPUT_DIR when set and is
// /output otherwise. Everything is deterministic: no wall clock, no
// random values and no timestamps anywhere in what it writes, so two
// runs to two directories produce byte-identical output.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });
cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Wrote ${outDir}/dossier.json (${dossier.length} bytes).`);
