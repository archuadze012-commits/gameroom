# Schema drift & the migration replay gate

## TL;DR

`npm run test:migrations` replays every file in `supabase/migrations/` against a
fresh in-process Postgres (pglite — no Docker) and fails if the tree can't build
a database from scratch. It runs in CI (`migration replay` job).

## Why this exists

For most of the project's life, schema changes were applied to the live Supabase
database directly (dashboard / uncommitted SQL). `supabase/migrations/` therefore
held only a **partial patch history** — of the 99 tables in production, **45 were
never created by any migration**; they were only ALTERed / indexed / policied /
granted by later migrations. Dozens of functions and a `private` schema were in
the same state. As a result the migration tree **could not build a fresh database**
(a from-scratch replay failed on ~half the files) — which breaks CI, local dev,
staging, and disaster recovery.

## What was done (2026-07-05)

1. **Baseline** — `20260525000000_baseline_drift_objects.sql` recreates the drift
   objects (45 tables, 5 enums, orphaned RPC/trigger signatures), reconstructed
   faithfully from the live `pg_catalog` (real types, defaults, PK/unique). Every
   statement is idempotent (`if not exists` / guarded), so applying it to the live
   DB is a no-op. It is dated before the earliest migration so it runs first.
   - FKs, CHECKs, indexes, RLS policies and real function **bodies** are *not*
     reproduced there — later migrations add those, and the gate only needs the
     base objects to exist. Orphaned functions get stub bodies with the live
     signatures (later migrations `create or replace` the real ones over them).
2. **`20260619_a2_drift_columns.sql`** — drift *columns* on migration-created
   tables (currently `pm_teams.is_bot`), added idempotently.
3. **Real bug fixed** — `20260619_playmanager_ovr_growth_cap_logic.sql` created
   `pm_player_ovr_growth_cap` returning `smallint`; `20260620`/`20260629` redefine
   it returning `integer`. `create or replace` cannot change a return type, so a
   from-scratch replay failed there (a strict `supabase db reset` would too). The
   original now returns `integer`, matching the live DB and the later migrations.

With those in place, all migrations replay cleanly.

## What the gate does and doesn't catch

The replay is **dependency-tolerant** (multi-pass fixed point), not strict
filename order — the historical migrations share coarse date prefixes and were
applied out of filename order, so strict ordering isn't meaningful here.

- **Catches:** a migration referencing a table/function/column that no migration
  creates, a SQL syntax error, or an illegal DDL op (e.g. changing a function's
  return type without a drop).
- **Tolerates (by design):** filename ordering, and re-creating a policy that a
  sibling migration also creates (normalised to `drop policy if exists` + create).

Two things stand in for the managed platform in the harness (not app schema):
Supabase-provided roles / `auth` + `storage` helpers / the realtime publication /
`uuid-ossp`. See `scripts/replay-migrations.mjs`.

## If the gate fails on your PR

Your new migration references something that doesn't exist in a fresh DB, or is
invalid SQL. Fix the migration. If you're referencing an object that genuinely
only exists on live (more drift), add it to the baseline — but prefer creating it
properly in your migration.

## The proper long-term fix

This baseline documents drift; it is not a substitute for a real schema dump. When
Supabase CLI access is convenient, consider `supabase db dump` → squash the whole
history into one authoritative baseline so `supabase db reset` works with standard
tooling.
