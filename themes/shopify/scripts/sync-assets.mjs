// Copies the artwork the theme needs from the AZAL site into Shopify's flat assets/ folder.
// Shopify themes cannot have sub-folders in assets/, so paths become prefixes:
//   public/assets/sky/d/dawn_sky.webp  ->  assets/sky-d-dawn_sky.webp
// Run: node scripts/sync-assets.mjs [path-to-azal-site]
import { cpSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = process.argv[2] || join(root, '..', '..');
const src = join(site, 'public', 'assets');
const mods = join(site, 'node_modules');
const out = join(root, 'assets');
if (!existsSync(src)) throw new Error(`AZAL site not found at ${site}`);

let n = 0;
const copy = (from, to) => { cpSync(from, join(out, to)); n++; };
const webps = (dir) => readdirSync(dir).filter((f) => f.endsWith('.webp'));

for (const v of ['d', 'm']) for (const f of webps(join(src, 'sky', v))) copy(join(src, 'sky', v, f), `sky-${v}-${f}`);
for (const f of webps(join(src, 'sky'))) copy(join(src, 'sky', f), `sky-${f}`);
for (const f of webps(join(src, 'origins'))) copy(join(src, 'origins', f), `origins-${f}`);
for (const f of webps(join(src, 'notes'))) copy(join(src, 'notes', f), `note-${f}`);
for (const f of webps(join(src, 'petal'))) copy(join(src, 'petal', f), `petal-${f.replace('petal_', '')}`);
for (const f of webps(join(src, 'bottle'))) copy(join(src, 'bottle', f), `bottle-${f}`);
// the hero turn: 25 frames of No. 1
for (const f of webps(join(src, 'bottle', 'no1_turn'))) copy(join(src, 'bottle', 'no1_turn', f), `hero-turn-${f}`);
copy(join(src, 'grain.png'), 'grain.png');

// libraries (MIT / GSAP standard licence, free for commercial use)
copy(join(mods, 'gsap', 'dist', 'gsap.min.js'), 'gsap.min.js');
copy(join(mods, 'gsap', 'dist', 'ScrollTrigger.min.js'), 'ScrollTrigger.min.js');
copy(join(mods, 'lenis', 'dist', 'lenis.min.js'), 'lenis.min.js');

// fonts (SIL Open Font License): latin + arabic subsets only
const fonts = [
  ['@fontsource-variable/cormorant', ['cormorant-latin-wght-normal.woff2', 'cormorant-latin-wght-italic.woff2', 'cormorant-latin-ext-wght-normal.woff2']],
  ['@fontsource-variable/hanken-grotesk', ['hanken-grotesk-latin-wght-normal.woff2', 'hanken-grotesk-latin-ext-wght-normal.woff2']],
  ['@fontsource/amiri', ['amiri-arabic-400-normal.woff2', 'amiri-arabic-700-normal.woff2', 'amiri-latin-400-normal.woff2']],
  ['@fontsource/ibm-plex-sans-arabic', ['ibm-plex-sans-arabic-arabic-300-normal.woff2', 'ibm-plex-sans-arabic-arabic-400-normal.woff2', 'ibm-plex-sans-arabic-arabic-500-normal.woff2']],
];
for (const [pkg, files] of fonts) for (const f of files) {
  const p = join(mods, pkg, 'files', f);
  if (existsSync(p)) copy(p, f); else console.warn('missing font', f);
}

const size = readdirSync(out).reduce((s, f) => s + statSync(join(out, f)).size, 0);
console.log(`copied ${n} files, assets/ is ${(size / 1048576).toFixed(1)} MB`);
