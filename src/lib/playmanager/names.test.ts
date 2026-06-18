import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { normalizeName, generateUniqueName } from './names.js';

test('normalizeName lowercases and strips spaces', () => {
  assert.equal(normalizeName('Giorgi Mchedlishvili'), 'giorgi mchedlishvili');
  assert.equal(normalizeName('  Nino  '), 'nino');
});

test('generateUniqueName produces a name not in the excluded set', async () => {
  const excluded = new Set(['giorgi beridze', 'nino kvaratskhelia']);
  const result = await generateUniqueName(excluded, 'virtual');
  assert.ok(!excluded.has(result.normalized));
  assert.ok(result.display.length > 3);
});

test('generateUniqueName returns normalized + display', async () => {
  const result = await generateUniqueName(new Set(), 'georgian');
  assert.equal(result.normalized, result.display.trim().toLowerCase());
});
