// ── RPC-exposure & privilege audit gate ──────────────────────────────────────
// Builds the full schema from migrations (shared pglite replay harness), then
// audits the resulting catalog for the ways a Postgres/Supabase schema leaks
// privilege to browser clients. Every public-schema function a role can EXECUTE
// is callable from a browser with the anon key via PostgREST /rest/v1/rpc, and
// every table a role can access is reachable via /rest/v1 — so the gate checks:
//
//   1. search_path pinning (SECURITY DEFINER functions). A definer function
//      without a pinned search_path resolves objects through the CALLER's path
//      while running with the OWNER's privileges — the classic escalation
//      footgun. The pin MUST include pg_temp last (so a caller-created temp
//      object can't shadow an unqualified name) and contain only trusted
//      schemas — an empty pin, `search_path=public` (no pg_temp), or
//      `from current` does NOT close the hole.
//
//   2. Client-executable privileged functions. Flag any function EXECUTE-able by
//      anon/authenticated/PUBLIC that is either (a) SECURITY DEFINER — runs with
//      owner rights, so client-callable = escalation — or (b) a MUTATING
//      function (writes tables / moves currency) — client-callable + a
//      caller-supplied team/user id = anyone mutating anyone's data. Read-only
//      SECURITY INVOKER helpers (cost formulas, counts) are fine to expose and
//      are not flagged. Trigger functions are exempt (PostgREST can't call them).
//
//   3. RLS enabled where policies exist. A table with ≥1 policy but RLS disabled
//      serves those policies inert — wide open to the roles holding Supabase's
//      default table grants. (This does NOT audit tables that have neither RLS
//      nor policies — that's a broader RLS-coverage question, out of scope here.)
//
// Runs on the REPLAYED tree, so it gates what a fresh build produces before it
// reaches live. Ground truth for the allowlist was the live catalog (2026-07-05).

import { replayMigrations } from './replay-lib.mjs';

// Functions clients are MEANT to call. Matched on (schema, name, arg COUNT) —
// not parameter names — so a rename can't silently drop the entry, while still
// distinguishing overloads. Format: 'schema.name/argcount'.
const ALLOWLIST = new Set([
  // Read-only opponent-history count on public team pages; intentionally PUBLIC
  // (verified on live, PR2 + Codex-2 audits).
  'public.pm_team_match_count/1',
]);

// A definer function may pin only these schemas; pg_temp must be present.
const TRUSTED_SCHEMAS = new Set(['public', 'private', 'extensions', 'pg_temp']);

const { files, pending, db } = await replayMigrations();
if (pending.size > 0) {
  console.error(`❌ cannot audit: ${pending.size}/${files.length} migrations failed to replay.`);
  console.error('   Run `npm run test:migrations` for the failure list.');
  process.exit(1);
}

// ── functions ────────────────────────────────────────────────────────────────
const fns = (await db.query(`
  select
    n.nspname as schema,
    p.proname as name,
    p.pronargs as nargs,
    n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as sig,
    p.prosecdef as definer,
    p.prorettype = 'pg_catalog.trigger'::regtype as is_trigger,
    p.proconfig as config,
    has_function_privilege('anon', p.oid, 'execute') as anon_x,
    has_function_privilege('authenticated', p.oid, 'execute') as auth_x,
    lower(pg_get_functiondef(p.oid)) ~ '(insert\\s+into|update\\s+\\S|delete\\s+from|perform\\s+pm_debit|perform\\s+pm_credit|:=\\s*pm_debit|:=\\s*pm_credit)' as mutates
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname not in ('pg_catalog', 'information_schema')
    and p.prokind in ('f', 'p')
`)).rows;

const badSearchPath = [];
const clientExecutable = [];
for (const fn of fns) {
  const sig = fn.sig;
  const allowed = ALLOWLIST.has(`${fn.schema}.${fn.name}/${fn.nargs}`);

  // 1. search_path pinning — definer functions only (escalation risk).
  if (fn.definer) {
    const sp = (fn.config ?? []).find((c) => c.startsWith('search_path='));
    const entries = sp ? sp.slice('search_path='.length).split(',').map((s) => s.trim().replace(/^"|"$/g, '')) : [];
    const ok = sp && entries.includes('pg_temp') && entries.every((e) => TRUSTED_SCHEMAS.has(e)) && !/from current/i.test(sp);
    if (!ok) badSearchPath.push(`${sig}  [${sp ?? 'no pin'}]`);
  }

  // 2. client-executable privileged functions. A SECURITY DEFINER function
  //    (Supabase advisor 0028/0029) or ANY mutating function is flagged when
  //    anon/authenticated can EXECUTE it. Trigger functions are NOT exempt: even
  //    though Postgres rejects direct invocation, an un-revoked definer trigger
  //    trips the platform advisor, so we keep the RPC surface clean by flagging
  //    it too (revoking EXECUTE never stops the trigger from firing).
  if (!allowed && (fn.anon_x || fn.auth_x)) {
    const privileged = fn.definer || fn.mutates;
    if (privileged) {
      const who = [fn.anon_x && 'anon', fn.auth_x && 'authenticated'].filter(Boolean).join(', ');
      const why = fn.definer ? (fn.is_trigger ? 'SECURITY DEFINER trigger' : 'SECURITY DEFINER') : 'mutating';
      clientExecutable.push(`${sig}  ← ${why}, executable by: ${who}`);
    }
  }
}

// ── RLS: policies present but RLS disabled ───────────────────────────────────
const rlsGaps = (await db.query(`
  select c.relname, count(pol.polname)::int as policies
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  join pg_policy pol on pol.polrelid = c.oid
  where c.relkind = 'r' and not c.relrowsecurity
  group by c.relname
  order by c.relname
`)).rows;

// ── report ───────────────────────────────────────────────────────────────────
console.log(`Audited ${fns.length} function(s) and RLS state across the replayed schema.`);
const clean = badSearchPath.length === 0 && clientExecutable.length === 0 && rlsGaps.length === 0;
if (clean) {
  console.log('✅ definer functions pin search_path (incl. pg_temp), no privileged function is client-executable, and every policied table has RLS enabled.');
  process.exit(0);
}

if (badSearchPath.length > 0) {
  console.error(`\n❌ ${badSearchPath.length} SECURITY DEFINER function(s) without a safe pinned search_path:`);
  for (const s of badSearchPath) console.error(`  • ${s}`);
  console.error('  Fix: add `set search_path = public, pg_temp` (pg_temp required, trusted schemas only).');
}
if (clientExecutable.length > 0) {
  console.error(`\n❌ ${clientExecutable.length} privileged function(s) executable by client roles:`);
  for (const s of clientExecutable) console.error(`  • ${s}`);
  console.error('  Fix: `revoke all on function … from public, anon, authenticated;`');
  console.error('       `grant execute on function … to service_role;`  (or allowlist a read-only one).');
}
if (rlsGaps.length > 0) {
  console.error(`\n❌ ${rlsGaps.length} table(s) with RLS policies but RLS DISABLED (policies are inert):`);
  for (const t of rlsGaps) console.error(`  • public.${t.relname}  (${t.policies} polic${t.policies === 1 ? 'y' : 'ies'})`);
  console.error('  Fix: `alter table public.<t> enable row level security;`');
}
process.exit(1);
