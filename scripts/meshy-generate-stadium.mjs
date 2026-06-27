import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const apiKey = process.env.MESHY_API_KEY;

if (!apiKey) {
  console.error('Missing MESHY_API_KEY in environment.');
  process.exit(1);
}

const projectRoot = process.cwd();
const referenceImagePath = path.resolve(
  projectRoot,
  process.argv[2] ?? 'public/playmanager/city/buildings/arena.png',
);
const outputModelPath = path.resolve(
  projectRoot,
  process.argv[3] ?? 'public/playmanager/models/stadium-meshy.glb',
);
const outputMetaPath = path.resolve(
  projectRoot,
  process.argv[4] ?? 'public/playmanager/models/stadium-meshy-task.json',
);
const outputPreviewPath = path.resolve(
  projectRoot,
  'public/playmanager/models/stadium-meshy-preview.png',
);

const texturePrompt = [
  'Stylized premium football arena for a browser game.',
  'Isometric readable shape, neon green outer lighting, red seating, bright green pitch,',
  'dark premium base materials, futuristic sports architecture, clean modular game asset,',
  'compact silhouette, polished low-poly look, not realistic, not messy.',
].join(' ');

async function fileToDataUri(filePath) {
  const buffer = await readFile(filePath);
  const base64 = buffer.toString('base64');
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${base64}`;
}

async function meshyRequest(url, init) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Meshy request failed (${response.status}): ${body}`);
  }

  return response.json();
}

async function pollTask(taskId) {
  while (true) {
    const task = await meshyRequest(`https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    console.log(`Meshy status: ${task.status} ${task.progress ?? 0}%`);

    if (task.status === 'SUCCEEDED') {
      return task;
    }

    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      throw new Error(task.task_error?.message || `Meshy task ended with status ${task.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

async function downloadFile(url, filePath) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed (${response.status}) for ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
}

async function main() {
  console.log(`Using reference image: ${referenceImagePath}`);

  const imageUrl = await fileToDataUri(referenceImagePath);
  const createResult = await meshyRequest('https://api.meshy.ai/openapi/v1/image-to-3d', {
    method: 'POST',
    body: JSON.stringify({
      image_url: imageUrl,
      model_type: 'lowpoly',
      should_texture: true,
      texture_prompt: texturePrompt,
      remove_lighting: true,
      target_formats: ['glb'],
    }),
  });

  const taskId = createResult.result;
  console.log(`Meshy task created: ${taskId}`);

  const task = await pollTask(taskId);
  await downloadFile(task.model_urls.glb, outputModelPath);

  if (task.thumbnail_url) {
    await downloadFile(task.thumbnail_url, outputPreviewPath);
  }

  await writeFile(outputMetaPath, JSON.stringify(task, null, 2));

  console.log(`Saved GLB to ${outputModelPath}`);
  console.log(`Saved metadata to ${outputMetaPath}`);

  if (task.thumbnail_url) {
    console.log(`Saved preview to ${outputPreviewPath}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
