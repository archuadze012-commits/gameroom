// Generate isometric football-city art with Z-Image-Turbo via the FREE
// official HF Space (community GPU, no inference credits needed).
// Usage: node --env-file=.env.local scripts/generate-city-art.mjs <jobId|all>
// Output: public/playmanager/iso/<id>.png

import { Client } from '@gradio/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'playmanager', 'iso');
const SPACE = 'Tongyi-MAI/Z-Image-Turbo';

function pngSize(buf) {
  if (buf.length > 24 && buf.toString('ascii', 12, 16) === 'IHDR') {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  return { w: '?', h: '?' };
}

const STYLE =
  'isometric 3D game art, blender octane render, dark moody night scene, deep teal and near-black ground, ' +
  'neon emerald-green and crimson-red accent lighting, volumetric glow, glossy clean stylized look, ' +
  'soft ambient occlusion, crisp edges, high detail, 45-degree top-down isometric camera, centered composition';

const JOBS = {
  // The big environment base: terrain only, NO buildings, just empty pads.
  env: {
    resolution: '2048x1152 ( 16:9 )',
    prompt:
      `${STYLE}. A small futuristic soccer training-complex island at night, top-down isometric view. ` +
      'Dark asphalt roads with glowing green neon lane markings forming a clean grid across the island, ' +
      'a central circular plaza with a glowing green fountain, ' +
      'several flat empty rectangular concrete building plots (foundation pads with subtle neon outline, completely empty, NO buildings), ' +
      'two empty green football pitches with crisp white line markings, ' +
      'the island surrounded by dark calm water with small wooden docks and tiny boats, ' +
      'dense dark pine forest framing all edges, scattered warm street lamps. ' +
      'Empty buildable lots only — no skyscrapers, no towers, no stadium, just ground, roads, pitches, plots, water and trees. ' +
      'the whole island fully visible and centered with empty margins around it',
  },
};

async function run() {
  const arg = process.argv[2] ?? 'env';
  const token = process.env.HF_TOKEN;

  console.log(`connecting to Space ${SPACE} …`);
  const app = await Client.connect(SPACE, token ? { hf_token: token } : {});
  await mkdir(OUT_DIR, { recursive: true });

  const ids = arg === 'all' ? Object.keys(JOBS) : [arg];
  for (const id of ids) {
    const job = JOBS[id];
    if (!job) {
      console.error(`unknown job: ${id} (have: ${Object.keys(JOBS).join(', ')})`);
      continue;
    }
    console.log(`generating "${id}" @ ${job.resolution} …`);
    const t0 = Date.now();
    const res = await app.predict('/generate', {
      prompt: job.prompt,
      resolution: job.resolution,
      seed: job.seed ?? 42,
      steps: job.steps ?? 8,
      shift: job.shift ?? 3,
      random_seed: job.seed === undefined,
      gallery_images: [],
    });

    const gallery = res?.data?.[0];
    const first = Array.isArray(gallery) ? gallery[0] : gallery;
    const url = first?.image?.url ?? first?.url ?? first?.image?.path;
    if (!url) {
      console.error('  no image url in response:', JSON.stringify(res?.data)?.slice(0, 400));
      continue;
    }
    const fetched = await fetch(url);
    const buf = Buffer.from(await fetched.arrayBuffer());
    const out = join(OUT_DIR, `${id}.png`);
    await writeFile(out, buf);
    const dim = pngSize(buf);
    console.log(`  saved ${out}  (${(buf.length / 1024).toFixed(0)} KB, ${dim.w}x${dim.h}, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
}

run().catch((err) => {
  console.error('FAILED:', err?.message ?? err);
  process.exit(1);
});
