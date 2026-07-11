// ── profiles UPDATE-grant coverage gate ──────────────────────────────────────
// `public.profiles` has a COLUMN-level UPDATE whitelist for `authenticated`
// (see supabase/migrations/20260529_profiles_update_grant_lockdown.sql): the
// table grant was revoked and re-granted only on a fixed column list. Postgres
// checks column UPDATE privilege for every column in a SET list, so writing
// ANY ungranted column fails the WHOLE update with "permission denied for
// table profiles" — even though the other columns in the same call are fine.
//
// This is a silent trap: a new profiles column added in one migration is easy
// to forget adding to the grant list in a later one. `dm_privacy` (added
// 20260714_user_blocks_and_dm_privacy.sql) shipped without ever being granted,
// so every settings save that touched it 500'd — masked for months because the
// client showed a success toast on any response other than `username_taken`.
// Fixed in 20260711_profile_display_name_cooldown.sql.
//
// This gate prevents a repeat: it statically finds every profiles column the
// app writes through an AUTHENTICATED-ROLE client (browser or server client —
// subject to grants), replays migrations into pglite, and fails if any such
// column lacks an UPDATE grant for `authenticated`.
//
// Scope/limits (static-analysis heuristics, not a full JS/TS parser):
//   • Only scans files that import an authenticated-role client
//     (createSupabaseBrowserClient / createSupabaseServerClient) and do NOT
//     also import createSupabaseAdminClient (service-role bypasses grants
//     entirely — mixing both in one file is unusual; such a file is skipped
//     with a warning rather than risk a wrong verdict).
//   • Recognizes two update-argument shapes: an inline object literal
//     (`.update({ col: val })`) and a single identifier built up beforehand
//     (`update.col = val; …; .update(update)`), which covers every current
//     profiles writer. A more exotic shape (spread, computed keys, a helper
//     function assembling the object) will under-report — this is a coverage
//     aid, not a substitute for testing the actual save.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { replayMigrations } from './replay-lib.mjs';

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT_DIR, 'src');
const ADMIN_CLIENT_RE = /createSupabaseAdminClient/;
const AUTH_CLIENT_RE = /createSupabaseBrowserClient|createSupabaseServerClient/;
const PROFILES_UPDATE_RE = /\.from\(\s*["']profiles["']\s*\)[\s\S]{0,80}?\.update\(\s*([^)]*?)\s*\)/g;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (['.ts', '.tsx'].includes(extname(entry))) out.push(p);
  }
  return out;
}

function extractLiteralKeys(objText) {
  // Flat `{ key: value, ... }` — sufficient for every current call site.
  return [...objText.matchAll(/(?:^|[{,])\s*([a-zA-Z_]\w*)\s*:/g)].map((m) => m[1]);
}

function extractIdentifierAssignedKeys(fileText, varName) {
  const re = new RegExp(`\\b${varName}\\.([a-zA-Z_]\\w*)\\s*=`, 'g');
  return [...fileText.matchAll(re)].map((m) => m[1]);
}

const writes = new Map(); // column -> Set<file>
const skipped = [];

for (const file of walk(SRC_DIR)) {
  const text = readFileSync(file, 'utf8');
  if (!PROFILES_UPDATE_RE.test(text)) continue;
  PROFILES_UPDATE_RE.lastIndex = 0;

  if (!AUTH_CLIENT_RE.test(text)) continue; // not an authenticated-role writer we can see
  if (ADMIN_CLIENT_RE.test(text)) {
    skipped.push(relative(ROOT_DIR, file).replaceAll('\\', '/'));
    continue;
  }

  for (const m of text.matchAll(PROFILES_UPDATE_RE)) {
    const arg = m[1].trim();
    let cols = [];
    if (arg.startsWith('{')) cols = extractLiteralKeys(arg);
    else if (/^[a-zA-Z_]\w*$/.test(arg)) cols = extractIdentifierAssignedKeys(text, arg);
    for (const col of cols) {
      if (!writes.has(col)) writes.set(col, new Set());
      writes.get(col).add(relative(ROOT_DIR, file).replaceAll('\\', '/'));
    }
  }
}

const { pending, files, db } = await replayMigrations();
if (pending.size > 0) {
  console.error(`❌ cannot check grants: ${pending.size}/${files.length} migrations failed to replay.`);
  console.error('   Run `npm run test:migrations` for the failure list.');
  process.exit(1);
}

const granted = new Set(
  (
    await db.query(`
      select column_name
      from information_schema.column_privileges
      where table_schema = 'public' and table_name = 'profiles'
        and grantee = 'authenticated' and privilege_type = 'UPDATE'
    `)
  ).rows.map((r) => r.column_name),
);

const missing = [...writes.keys()].filter((col) => !granted.has(col)).sort();

console.log(`Scanned ${writes.size} distinct profiles column(s) written by authenticated-role client code.`);
if (skipped.length > 0) {
  console.log(`(skipped ${skipped.length} file(s) that mix an admin client with a profiles update — verify manually: ${skipped.join(', ')})`);
}

if (missing.length === 0) {
  console.log('✅ every profiles column written by app code has an authenticated UPDATE grant.');
  process.exit(0);
}

console.error(`\n❌ ${missing.length} profiles column(s) are written by app code but have NO 'authenticated' UPDATE grant:`);
for (const col of missing) {
  console.error(`  • ${col}  ← written by: ${[...writes.get(col)].join(', ')}`);
}
console.error('\n  Every write through these columns will fail the WHOLE update with "permission denied for table profiles".');
console.error('  Fix: add the column to the grant in supabase/migrations/20260529_profiles_update_grant_lockdown.sql\'s');
console.error('       successor (a new migration) — `grant update (<col>) on table public.profiles to authenticated;`');
console.error('       — UNLESS the column must not be user-writable, in which case stamp/enforce it via a BEFORE UPDATE');
console.error('       trigger instead (see trg_display_name_cooldown) and remove the app-code write.');
process.exit(1);
