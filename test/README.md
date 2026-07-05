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
- `pm_respond_transfer_offer` (reject / counter) — turn guard, price floor, invalid price/action, awaiting-party flip
- `pm_open_pack` — draw + assign + squad + charge, unknown pack, insufficient-funds rollback, pool exhaustion
- `pm_train_player` — training-quota guards: ownership, availability, per-cycle capacity (scales with head coach + training facility)
- `pm_train_player` (stat gain) — XP-budget model: bank-on-poor-budget, buy focus-stat points + lift pending OVR, never overshoot the growth cap
- cup/league processDue — the guarded status transitions (claim ready→processing,
  payout in_progress→completed) that make the lazy processing model safe from
  double-simulation / double-prize

## supabase-js → pglite adapter (`test/harness/pglite-supabase.ts`)

`asSupabase(db)` wraps a pglite instance as a supabase-js-like client, so real
`db`-taking TypeScript code (lib functions, server actions) can run against the
real engine in tests. Supports the flat query surface — `from().select()`,
`eq/neq/in/is/lt/lte/gt/gte`, `or('a.eq.1,b.eq.2')`, `order/limit/range`,
`single/maybeSingle`, `insert/update/upsert/delete` (with `.select()` returning),
`count/head`, and `rpc()`. Nested foreign-table embeds (`player:pm_players(...)`)
are **dropped** to their flat columns — code that reads the embed gets undefined
and falls back to its default, so the surrounding logic still runs.

Proven end-to-end by `next-fixture.itest.ts` (unmodified `getNextFixtureForTeam`)
and `server-action-ticket.itest.ts` (the unmodified `savePlayManagerTicketPrice`
server action — mocking server-only, next/cache, and the admin/server client
seams so getAuthenticatedTeam + the real RPC + pm_log_event all run against
pglite). `supabase-adapter.itest.ts` covers each operation directly.

### Testing a server action

Server actions build their own clients, so mock the module seams and dynamic-
import the action after:

```ts
mock.module('server-only', { namedExports: {} });
mock.module('next/cache', { namedExports: { revalidatePath: () => {} } });
mock.module('@/lib/supabase/admin', { namedExports: { createSupabaseAdminClient: () => asSupabase(db) } });
mock.module('@/lib/supabase/server', { namedExports: {
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: USER } } }) } }),
}});
const { theAction } = await import('../../src/app/playmanager/actions/<domain>-actions.js');
```

Run with `--experimental-test-module-mocks` (already in the test:integration
script). Best for embed-light actions; heavy post-action chains (advancePlayManagerTime,
award_xp) need their RPCs loaded or stubbed.

Extend next to offer counter/reject edge cases and the training stat-gain happy
path (loads the XP-budget helpers).
