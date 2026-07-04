# PlayManager tests

Two suites:

- **`npm run test:unit`** — fast pure-logic + fake-client tests (`src/**/*.test.ts`).
- **`npm run test:integration`** — RPC-backed tests that run the **real** PlayManager
  Postgres functions against an in-process Postgres (`test/integration/**/*.itest.ts`).

## Integration harness (`test/harness/pglite-db.ts`)

There is no Docker / Supabase CLI / local Postgres in most dev + CI environments,
and the only live database is production. So integration tests use
[`@electric-sql/pglite`](https://github.com/electric-sql/pglite) — Postgres 16
compiled to WASM, running in-process. No external services.

We do **not** replay the full migration history (134 files, heavy Supabase-isms:
`auth`, roles, RLS, `uuid-ossp`). Instead each test:

1. `bootTestDb()` — a fresh pglite with a tiny compat shim (the `anon` /
   `authenticated` / `service_role` roles that grant/revoke statements need, and
   a `uuid_generate_v4()` mapped onto the built-in `gen_random_uuid()`).
2. Creates the **minimal tables** the RPC under test touches.
3. `loadRpc(db, 'pm_...')` — extracts that function's **latest actual definition**
   from `supabase/migrations` and loads it, so the plpgsql logic under test
   (ownership guards, state transitions, fund math) is the real production code.

### Adding a flow

```ts
import { bootTestDb, loadRpc } from '../harness/pglite-db.js';

before(async () => {
  db = await bootTestDb();
  await db.exec(`create table public.pm_whatever ( ... );`); // only the columns the RPC reads/writes
  await loadRpc(db, 'pm_your_rpc');
});
```

Guard / rejection paths raise early, so they need a small table closure and
directly validate the security model. Happy paths pull in the full helper
closure — load each with its own `loadRpc()` call and create every table it
touches. Example: `offer-accept.itest.ts` loads six functions
(`pm_credit`, `pm_debit`, `pm_transfer_floor`, `pm_pair_transfers_this_season`,
`pm_settle_transfer`, `pm_respond_transfer_offer`) over eight tables and asserts
the full settlement plus the atomic rollback on insufficient funds.

Current coverage:
- `pm_cancel_transfer_offer` — participant guards
- `pm_sell_player` — ownership guard
- `pm_respond_transfer_offer` (accept) — full settlement, turn guard, insufficient-funds rollback
- `pm_open_pack` — draw + assign + squad + charge, unknown pack, insufficient-funds rollback, pool exhaustion
- `pm_train_player` — training-quota guards: ownership, availability, per-cycle capacity (scales with head coach + training facility)
- cup/league processDue — the guarded status transitions (claim ready→processing,
  payout in_progress→completed) that make the lazy processing model safe from
  double-simulation / double-prize

The processDue functions themselves are TypeScript orchestrators (supabase-js +
a TS match engine), so only their SQL safety invariant is covered here. Running
the full orchestration would need a supabase-js→pglite adapter — the natural next
infra step, which would also unlock testing the server actions and API routes.

Extend next to offer counter/reject edge cases and the training stat-gain happy
path (loads the XP-budget helpers).
