// Remove a flat background from a sprite by flood-filling from the borders.
// Keeps interior dark pixels (only border-connected bg is cut). Trims + webp.
// Usage: node scripts/remove-bg.mjs "<input>" <outName> [tolerance]

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'playmanager', 'iso', 'sprites');

const input = process.argv[2];
const outName = process.argv[3] ?? 'sprite';
const TOL = Number(process.argv[4] ?? 52); // colour distance to background

if (!input) { console.error('need input path'); process.exit(1); }

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const idx = (x, y) => (y * W + x) * 4;

// background colour = average of the 4 corners
const corners = [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]];
let br = 0, bg = 0, bb = 0;
for (const [x, y] of corners) { const i = idx(x, y); br += data[i]; bg += data[i + 1]; bb += data[i + 2]; }
br /= 4; bg /= 4; bb /= 4;
const tol2 = TOL * TOL;
const near = (i) => {
  const dr = data[i] - br, dg = data[i + 1] - bg, db = data[i + 2] - bb;
  return dr * dr + dg * dg + db * db <= tol2;
};

// flood fill from every border pixel that matches the background
const visited = new Uint8Array(W * H);
const stack = [];
const push = (x, y) => { if (x >= 0 && x < W && y >= 0 && y < H && !visited[y * W + x]) stack.push(x, y); };
for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }

while (stack.length) {
  const y = stack.pop(); const x = stack.pop();
  const p = y * W + x;
  if (visited[p]) continue;
  visited[p] = 1;
  if (!near(idx(x, y))) continue; // boundary of subject — stop
  data[idx(x, y) + 3] = 0; // transparent
  push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
}

// content bounding box (non-transparent)
let minX = W, minY = H, maxX = 0, maxY = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (data[idx(x, y) + 3] > 8) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
}
const cw = Math.max(1, maxX - minX + 1);
const ch = Math.max(1, maxY - minY + 1);

await mkdir(OUT_DIR, { recursive: true });
const out = join(OUT_DIR, `${outName}.webp`);
await sharp(data, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left: minX, top: minY, width: cw, height: ch })
  .webp({ quality: 92, alphaQuality: 100 })
  .toFile(out);

console.log(`saved ${out}  (${cw}x${ch} from ${W}x${H}, bg≈${br | 0},${bg | 0},${bb | 0}, tol=${TOL})`);
