// ── Shared migration-replay harness ──────────────────────────────────────────
// Builds the full schema from supabase/migrations/ inside an in-process Postgres
// (pglite — Postgres 16 in WASM, no Docker). Used by two CI gates:
//   • scripts/replay-migrations.mjs      — "the tree builds from scratch"
//   • scripts/audit-security-definer.mjs — "the built tree is safely configured"
//
// The replay is DEPENDENCY-TOLERANT (multi-pass fixed point), not strict
// filename order: this repo's historical migrations share coarse date prefixes
// and were applied out of filename order, so a strict replay is not meaningful.
// Each pass applies every still-pending migration whose dependencies now exist;
// it converges when all apply, or reports the ones that never could.
// See docs/SCHEMA_DRIFT.md.
//
// Two things stand in for the managed platform (they are NOT app schema):
//   • PLATFORM_SHIM — roles, auth/storage schemas + helpers, realtime publication
//     and uuid-ossp, which Supabase provides but a bare engine does not.
//   • policy normalisation — several migrations (re)create a policy relying on a
//     prior `drop policy if exists`; out-of-order application makes each create
//     idempotent so it isn't a false failure.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

export const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');

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

  -- Model Supabase's default privileges: new objects in public are granted to
  -- anon/authenticated by default. Without this a migration's \`revoke ... from
  -- public\` looks sufficient in replay while leaving anon/authenticated grants
  -- intact on live (they're separate from PUBLIC). Applying this BEFORE migrations
  -- means every function/table they create carries the default grant, so only an
  -- explicit \`revoke ... from anon, authenticated\` actually locks it — matching
  -- production, and letting the security audit catch revoke-from-public-only bugs.
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`;

function preprocess(sql) {
  let out = sql.replace(/create\s+extension\s+if\s+not\s+exists\s+"?uuid-ossp"?\s*;/gi, '-- [replay] uuid-ossp shimmed');
  out = out.replace(
    /create\s+policy\s+("(?:[^"]+)"|[a-z0-9_]+)\s+on\s+((?:"?[a-z0-9_]+"?\.)?"?[a-z0-9_]+"?)/gi,
    (m, name, tbl) => `drop policy if exists ${name} on ${tbl};\n${m}`,
  );
  return out;
}

// Replay every migration into a fresh pglite instance. Returns
// { db, files, passes, pending: Map<file, lastError> } — pending is empty on
// full convergence. Caller owns closing/dropping the db.
export async function replayMigrations() {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

  const db = new PGlite();
  await db.exec(PLATFORM_SHIM);
  try { await db.exec('create publication supabase_realtime;'); } catch { /* guarded inside migrations */ }

  const pending = new Map(files.map((f) => [f, preprocess(readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))]));
  const lastErr = new Map();
  let passes = 0;
  while (pending.size > 0) {
    passes++;
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

  const failed = new Map([...pending.keys()].map((f) => [f, lastErr.get(f)]));
  return { db, files, passes, pending: failed };
}
