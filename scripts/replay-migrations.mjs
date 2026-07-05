// ── Migration replay gate ────────────────────────────────────────────────────
// Replays every file in supabase/migrations/ against a fresh in-process Postgres
// (pglite — Postgres 16 in WASM, no Docker) and fails if any migration can't be
// applied to an empty database. This catches the breakages that matter in a PR:
// a migration referencing a table/function/column defined nowhere, a syntax
// error, or an illegal DDL op (e.g. create-or-replace changing a return type).
//
// It is DEPENDENCY-TOLERANT (multi-pass fixed point), not strict filename order:
// this repo's historical migrations share coarse date prefixes and were applied
// out of filename order, so a strict replay is not meaningful. Each pass applies
// every still-pending migration whose dependencies now exist; it converges when
// all apply, or reports the ones that never could. See docs/SCHEMA_DRIFT.md.
//
// Two things stand in for the managed platform (they are NOT app schema):
//   • PLATFORM_SHIM — roles, auth/storage schemas + helpers, realtime publication
//     and uuid-ossp, which Supabase provides but a bare engine does not.
//   • policy normalisation — several migrations (re)create a policy relying on a
//     prior `drop policy if exists`; out-of-order application makes each create
//     idempotent so it isn't a false failure.
//
// The drift objects that used to make this impossible (~45 tables + functions
// created directly on live, never in a migration) now live in the committed
// baseline 20260525000000_baseline_drift_objects.sql.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');

const PLATFORM_SHIM = `
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
  end $$;
  create schema if not exists auth;
  create schema if not exists storage;
  create or replace function public.uuid_generate_v4() returns uuid language sql as $$ select gen_random_uuid() $$;
  create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create or replace function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'authenticated') $$;
  create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
  create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb, created_at timestamptz default now());
  create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, created_at timestamptz default now(), updated_at timestamptz default now(), metadata jsonb);
  create or replace function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
`;

function preprocess(sql) {
  let out = sql.replace(/create\s+extension\s+if\s+not\s+exists\s+"?uuid-ossp"?\s*;/gi, '-- [replay] uuid-ossp shimmed');
  out = out.replace(
    /create\s+policy\s+("(?:[^"]+)"|[a-z0-9_]+)\s+on\s+((?:"?[a-z0-9_]+"?\.)?"?[a-z0-9_]+"?)/gi,
    (m, name, tbl) => `drop policy if exists ${name} on ${tbl};\n${m}`,
  );
  return out;
}

const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
console.log(`Replaying ${files.length} migrations against pglite…`);

const db = new PGlite();
await db.exec(PLATFORM_SHIM);
try { await db.exec('create publication supabase_realtime;'); } catch { /* guarded inside migrations */ }

const pending = new Map(files.map((f) => [f, preprocess(readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))]));
const lastErr = new Map();
let pass = 0;
while (pending.size > 0) {
  pass++;
  let applied = 0;
  for (const [file, sql] of [...pending]) {
    try {
      await db.exec('BEGIN'); await db.exec(sql); await db.exec('COMMIT');
      pending.delete(file); applied++;
    } catch (e) {
      try { await db.exec('ROLLBACK'); } catch { /* rollback of a failed tx */ }
      lastErr.set(file, String(e.message).split('\n')[0]);
    }
  }
  if (applied === 0) break; // fixed point reached
}

if (pending.size === 0) {
  console.log(`✅ all ${files.length} migrations replayed cleanly (${pass} passes).`);
  process.exit(0);
}
console.error(`\n❌ ${pending.size} migration(s) could not be applied to a fresh database:\n`);
for (const [file] of pending) console.error(`  • ${file}\n      ${lastErr.get(file)}`);
console.error('\nA migration references an object that no migration creates, has a syntax');
console.error('error, or performs an illegal change. Fix the migration (or, for genuine');
console.error('live-DB drift, add it to the baseline). See docs/SCHEMA_DRIFT.md.');
process.exit(1);
