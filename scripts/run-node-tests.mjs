import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const [root, suffix] = process.argv.slice(2);

if (!root || !suffix) {
  throw new Error('Usage: node scripts/run-node-tests.mjs <root> <suffix>');
}

async function findTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findTests(path);
    return entry.isFile() && entry.name.endsWith(suffix) ? [path] : [];
  }));
  return files.flat();
}

const tests = (await findTests(resolve(root))).sort();
if (tests.length === 0) {
  throw new Error(`No ${suffix} files found under ${root}`);
}

const result = spawnSync(process.execPath, [
  '--import', 'tsx',
  '--test',
  '--experimental-test-module-mocks',
  '--disable-warning=ExperimentalWarning',
  ...tests,
], { stdio: 'inherit' });

process.exit(result.status ?? 1);
