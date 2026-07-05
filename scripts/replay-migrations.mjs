// ── Migration replay gate ────────────────────────────────────────────────────
// Replays every file in supabase/migrations/ against a fresh in-process Postgres
// and fails if any migration can't be applied to an empty database. This catches
// the breakages that matter in a PR: a migration referencing a table/function/
// column defined nowhere, a syntax error, or an illegal DDL op (e.g.
// create-or-replace changing a return type).
//
// The replay engine (pglite instance, platform shim, dependency-tolerant
// multi-pass) lives in scripts/replay-lib.mjs and is shared with the
// security-definer audit gate. See docs/SCHEMA_DRIFT.md for the whys.

import { replayMigrations } from './replay-lib.mjs';

const { files, passes, pending } = await replayMigrations();
console.log(`Replaying ${files.length} migrations against pglite…`);

if (pending.size === 0) {
  console.log(`✅ all ${files.length} migrations replayed cleanly (${passes} passes).`);
  process.exit(0);
}
console.error(`\n❌ ${pending.size} migration(s) could not be applied to a fresh database:\n`);
for (const [file, err] of pending) console.error(`  • ${file}\n      ${err}`);
console.error('\nA migration references an object that no migration creates, has a syntax');
console.error('error, or performs an illegal change. Fix the migration (or, for genuine');
console.error('live-DB drift, add it to the baseline). See docs/SCHEMA_DRIFT.md.');
process.exit(1);
