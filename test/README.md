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

Prefer testing the **guard / rejection paths** first — they raise early, so they
need a small table closure and directly validate the security model. Happy paths
that credit wallets or transfer squads pull in more helper functions
(`pm_credit`, `pm_settle_transfer`, `pm_player_overall_from_stats`, …); load those
with additional `loadRpc()` calls as you cover them.

Current coverage: `pm_cancel_transfer_offer` (participant guards), `pm_sell_player`
(ownership guard). Extend to pack opening, offer accept/settle, training quota,
cup/league processing.
