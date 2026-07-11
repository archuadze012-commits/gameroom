// One-off: pull the game covers that were hot-linked from slow third-party hosts
// (alphacoders, givemesportimages, bluestacks) into local, optimized assets so
// /games no longer depends on those hosts and can serve small, cacheable covers.
// The other DB games already have a local cover in public/games/covers/ — those
// are just re-pointed in the DB (no download needed), done separately.
//
// Run: node scripts/localize-game-covers.mjs
// Then update games.cover_url to the emitted /games/covers/<slug>.webp paths.

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'games', 'covers');

// Only the covers with NO existing local file. Sourced from games.cover_url.
const TARGETS = [
  { slug: 'clash-royale', url: 'https://images2.alphacoders.com/855/thumb-1920-855974.jpg' },
  { slug: 'fifa-mobile', url: 'https://static0.givemesportimages.com/wordpress/wp-content/uploads/2025/03/epl_-fifa-mobile.jpg?w=1600&h=900&fit=crop' },
  { slug: 'standoff', url: 'https://cdn-www.bluestacks.com/bs-images/standoff-2-1.webp' },
];

for (const { slug, url } of TARGETS) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (asset-localizer)' } });
  if (!res.ok) {
    console.error(`✗ ${slug}: HTTP ${res.status} from ${url}`);
    process.exitCode = 1;
    continue;
  }
  const input = Buffer.from(await res.arrayBuffer());
  // Cap width at 800px (matches the existing local covers); never upscale.
  // webp q80 keeps these well under the ~80KB the current local covers sit at.
  const output = await sharp(input)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const outPath = join(OUT_DIR, `${slug}.webp`);
  writeFileSync(outPath, output);
  const meta = await sharp(output).metadata();
  console.log(`✓ ${slug}: ${meta.width}x${meta.height} webp, ${Math.round(output.length / 1024)}KB  →  /games/covers/${slug}.webp`);
}
