import sharp from "sharp";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.join(__dirname, "../public/characters/gameroom-vanguard.png");

const { data, info } = await sharp(inputPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const pixels = new Uint8ClampedArray(data);

// Only process the bottom 15% of the image (shoe zone)
const startY = Math.floor(height * 0.85);

const idx = (x, y) => (y * width + x) * channels;
const alpha = (x, y) => pixels[idx(x, y) + 3];

// Build edge mask only in shoe zone
const edgeMask = new Uint8Array(width * height);
for (let y = startY; y < height - 1; y++) {
  for (let x = 1; x < width - 1; x++) {
    if (alpha(x, y) === 0) continue;
    if (
      alpha(x - 1, y) === 0 ||
      alpha(x + 1, y) === 0 ||
      alpha(x, y - 1) === 0 ||
      alpha(x, y + 1) === 0
    ) {
      edgeMask[y * width + x] = 1;
    }
  }
}

let changed = 0;
for (let y = startY; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (!edgeMask[y * width + x]) continue;
    const i = idx(x, y);
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const brightness = (r + g + b) / 3;
    if (brightness > 180) {
      pixels[i + 3] = 0;
      changed++;
    }
  }
}

await sharp(Buffer.from(pixels.buffer), {
  raw: { width, height, channels },
})
  .png({ compressionLevel: 9 })
  .toFile(inputPath);

console.log(`Done. ${changed} shoe fringe pixels removed (bottom 15% only).`);
