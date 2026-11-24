// Solmar Bay, handed in: a small Node 22 program (standard library only) that
// copies this repository's game/ and screenshots/ into the output directory and
// writes the dossier the judge reads, using the vendored make.fun library.
//
// Run it locally to check the entry before submitting:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output; the grader runs
// it twice and both runs must write identical bytes, so nothing here depends on
// the clock, the network, or anything outside this directory.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The gate's caps, mirrored here so a bad entry fails loudly at home instead of
// silently at the gate: at most 4 screenshots of 256 KiB, game/ under 993 files
// and 48 MiB, no path under game/ longer than 1000 bytes, dossier text 160 KiB.
// The screenshots are real renders of this game, staged with
// ?shot=start|play|chase|mission&seed=1 (see game/src/shots.js and shots.json).
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
