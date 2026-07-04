import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

// ── In-process Postgres test harness (pglite) ────────────────────────────────
// Runs the REAL PlayManager RPC SQL against a real Postgres engine (Postgres 16
// compiled to WASM) — no Docker, no Supabase, CI-friendly. We don't replay the
// full 134-migration history (heavy Supabase-isms: auth, roles, RLS, uuid-ossp).
// Instead each test boots a fresh db, creates the minimal tables the RPC under
// test touches, and loads that RPC's ACTUAL definition from the migrations via
// loadRpc(). That keeps 100% fidelity on the plpgsql logic we care about
// (ownership guards, state transitions, fund math) with a bounded setup.

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

// Minimal Supabase compatibility shim so extracted DDL/functions load cleanly.
const BOOTSTRAP = `
  -- Roles that grant/revoke statements target.
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
  end $$;
  -- uuid-ossp is unavailable in pglite; map its generator onto the built-in.
  create or replace function public.uuid_generate_v4() returns uuid
    language sql as $$ select gen_random_uuid() $$;
`;

export async function bootTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(BOOTSTRAP);
  return db;
}

// Extract the LATEST definition of a plpgsql function by name from the migration
// files (chronological by filename — the newest redefinition wins) and apply it.
export async function loadRpc(db: PGlite, fnName: string): Promise<void> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const re = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+(public\\.)?${fnName}\\s*\\(`,
    'i',
  );

  let sql: string | null = null;
  for (const file of files) {
    const text = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    const match = re.exec(text);
    if (!match) continue;
    const start = match.index;
    // Function bodies are dollar-quoted ($$ or $function$). Find the opening tag
    // after the AS keyword, then its matching closing tag.
    const tagMatch = /\bas\s+(\$[a-zA-Z_]*\$)/i.exec(text.slice(start));
    if (!tagMatch) continue;
    const tag = tagMatch[1];
    const bodyOpen = start + (tagMatch.index ?? 0) + tagMatch[0].length;
    const close = text.indexOf(tag, bodyOpen);
    if (close === -1) continue;
    // Include the trailing semicolon after the closing tag.
    const end = text.indexOf(';', close + tag.length) + 1;
    sql = text.slice(start, end);
  }

  if (!sql) throw new Error(`loadRpc: no definition found for ${fnName}`);
  await db.exec(sql);
}
