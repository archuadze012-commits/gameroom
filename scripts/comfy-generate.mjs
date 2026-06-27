// Generate isometric football-city art locally via ComfyUI (JuggernautXL / SDXL).
// ComfyUI must be running on 127.0.0.1:8188.
// Usage: node scripts/comfy-generate.mjs <jobId|all> [seed]
// Output: public/playmanager/iso/<id>.png

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'playmanager', 'iso');
const HOST = 'http://127.0.0.1:8188';
const CKPT = 'juggernautXL_v9.safetensors';

const STYLE =
  'masterpiece, best quality, highly detailed, sharp focus, intricate, ' +
  'isometric 3D game art, stylized but richly detailed, blender octane render, dark moody night scene, ' +
  'deep teal and near-black ground, neon emerald-green and crimson-red accent lighting, volumetric glow, ' +
  'soft ambient occlusion, clean glossy surfaces, crisp edges, 45-degree top-down isometric camera';

const NEG =
  'one big single field, tall buildings, skyscrapers, stadium, towers, houses, people, characters, text, ' +
  'watermark, logo, signature, blurry, soft, low quality, lowres, jpeg artifacts, distorted, ugly, flat 2d, ' +
  'oversaturated, washed out, daytime, bright sky, empty featureless';

const JOBS = {
  env: {
    width: 1344,
    height: 768,
    cfg: 7,
    steps: 36,
    hires: 1.35, // second pass upscale factor for detail
    prompt:
      `${STYLE}. Top-down isometric view of a small futuristic soccer-club city district at night, full district centered. ` +
      'An organized grid of separate city blocks divided by dark asphalt roads with glowing green neon lane markings, ' +
      'many flat empty rectangular concrete construction plots and bare paved vacant lots with thin neon outlines (foundation pads, completely empty, ready to build), ' +
      'a central circular plaza with a glowing green fountain, ' +
      'two separate green football training pitches with crisp white line markings, ' +
      'small detailed props: street lamps, neon bollards, low fences, manholes, parked details, thin ground fog, ' +
      'the whole district bordered by dark calm water with small wooden docks and tiny boats, dense dark pine forest framing the edges. ' +
      'distinct separate vacant lots, NOT one big field, no structures on the plots',
  },
};

const wf = (job, seed) => {
  const g = {
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: CKPT } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: job.prompt, clip: ['4', 1] } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: NEG, clip: ['4', 1] } },
    '5': { class_type: 'EmptyLatentImage', inputs: { width: job.width, height: job.height, batch_size: 1 } },
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed, steps: job.steps ?? 30, cfg: job.cfg ?? 6.5,
        sampler_name: 'dpmpp_2m', scheduler: 'karras', denoise: 1,
        model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0],
      },
    },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
    '9': { class_type: 'SaveImage', inputs: { images: ['8', 0], filename_prefix: 'iso' } },
  };

  if (job.hires && job.hires > 1) {
    // 2nd pass: latent upscale + low-denoise resample → sharper, more detail
    g['10'] = { class_type: 'LatentUpscaleBy', inputs: { samples: ['3', 0], upscale_method: 'nearest-exact', scale_by: job.hires } };
    g['11'] = {
      class_type: 'KSampler',
      inputs: {
        seed: seed + 1, steps: 20, cfg: job.cfg ?? 6.5,
        sampler_name: 'dpmpp_2m', scheduler: 'karras', denoise: 0.45,
        model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['10', 0],
      },
    };
    g['8'].inputs.samples = ['11', 0];
  }
  return g;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generate(id, job, seed) {
  const res = await fetch(`${HOST}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: wf(job, seed) }),
  });
  if (!res.ok) throw new Error(`/prompt ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const { prompt_id } = await res.json();
  process.stdout.write(`  queued ${prompt_id} `);

  // poll history
  for (let i = 0; i < 300; i++) {
    await sleep(1500);
    const h = await (await fetch(`${HOST}/history/${prompt_id}`)).json();
    const entry = h[prompt_id];
    if (entry?.outputs) {
      const img = entry.outputs['9']?.images?.[0];
      if (!img) throw new Error('no image in outputs');
      const url = `${HOST}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${img.type}`;
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      const out = join(OUT_DIR, `${id}.png`);
      await writeFile(out, buf);
      return { out, kb: (buf.length / 1024).toFixed(0) };
    }
    if (i % 4 === 0) process.stdout.write('.');
  }
  throw new Error('timed out waiting for generation');
}

async function run() {
  const arg = process.argv[2] ?? 'env';
  const seedArg = process.argv[3] ? Number(process.argv[3]) : Math.floor(Math.random() * 2 ** 31);
  await mkdir(OUT_DIR, { recursive: true });

  const ids = arg === 'all' ? Object.keys(JOBS) : [arg];
  for (const id of ids) {
    const job = JOBS[id];
    if (!job) { console.error(`unknown job: ${id}`); continue; }
    console.log(`generating "${id}" ${job.width}x${job.height} seed=${seedArg}`);
    const t0 = Date.now();
    const { out, kb } = await generate(id, job, seedArg);
    console.log(`\n  saved ${out} (${kb} KB, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
}

run().catch((e) => { console.error('\nFAILED:', e?.message ?? e); process.exit(1); });
