import { strict as assert } from 'node:assert';
import { test, before, after, mock } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb, loadRpc } from '../harness/pglite-db.js';
import { asSupabase } from '../harness/pglite-supabase.js';

// End-to-end proof of a real Next.js server action against the pglite engine via
// the supabase adapter. Runs the UNMODIFIED savePlayManagerTicketPrice through
// its whole stack — getAuthenticatedTeam (mocked auth + a real pm_teams/pm_wallets
// lookup), the real pm_save_ticket_price RPC, and the real pm_log_event side
// effect — asserting the finance row is persisted and an event is written.
//
// The action creates its own clients internally, so we mock the module seams:
// server-only, next/cache (revalidatePath), @/lib/supabase/admin → the adapter,
// @/lib/supabase/server → a fake auth returning our user.

let db: PGlite;
let savePlayManagerTicketPrice: typeof import('../../src/app/playmanager/actions/club-finance-actions.js').savePlayManagerTicketPrice;

const USER = '00000000-0000-0000-0000-0000000000aa';
const TEAM = '00000000-0000-0000-0000-0000000000bb';

before(async () => {
  db = await bootTestDb();
  await db.exec(`
    create table public.pm_teams (id uuid primary key, user_id uuid, name text);
    create table public.pm_wallets (team_id uuid primary key, balance bigint default 0);
    create table public.pm_finance_state (
      team_id uuid primary key, ticket_price integer default 28,
      sponsor_tier text default 'local', sponsor_weekly_amount bigint default 0,
      updated_at timestamptz default now()
    );
    create table public.pm_calendar (team_id uuid primary key, week_no integer default 1, day_no integer default 1);
    create table public.pm_event_feed (
      id uuid primary key default gen_random_uuid(), team_id uuid, category text, accent text,
      title text, detail text, href text, week_no integer, day_no integer, created_at timestamptz default now()
    );
  `);
  await db.query(`insert into pm_teams (id, user_id, name) values ($1,$2,'My Club')`, [TEAM, USER]);
  await db.query(`insert into pm_wallets (team_id, balance) values ($1, 1000)`, [TEAM]);
  for (const fn of ['pm_ensure_finance_state', 'pm_save_ticket_price', 'pm_ensure_calendar', 'pm_log_event']) {
    await loadRpc(db, fn);
  }
  const sb = asSupabase(db);

  mock.module('server-only', { namedExports: {} });
  mock.module('next/cache', { namedExports: { revalidatePath: () => {}, revalidateTag: () => {} } });
  mock.module('@/lib/supabase/admin', { namedExports: { createSupabaseAdminClient: () => sb } });
  mock.module('@/lib/supabase/server', {
    namedExports: {
      createSupabaseServerClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: USER } }, error: null }) },
      }),
    },
  });

  ({ savePlayManagerTicketPrice } = await import('../../src/app/playmanager/actions/club-finance-actions.js'));
});

after(async () => { await db?.close(); });

test('saves the ticket price and logs a finance event end-to-end', async () => {
  const res = await savePlayManagerTicketPrice(35);
  assert.equal(res.success, true);

  const { rows } = await db.query<{ ticket_price: number }>(
    `select ticket_price from pm_finance_state where team_id = $1`, [TEAM],
  );
  assert.equal(rows[0].ticket_price, 35);

  const { rows: ev } = await db.query<{ c: string; category: string }>(
    `select count(*)::int as c, max(category) as category from pm_event_feed where team_id = $1`, [TEAM],
  );
  assert.equal(Number(ev[0].c), 1);
  assert.equal(ev[0].category, 'finance');
});

test('clamps an out-of-range price at the boundary before the RPC', async () => {
  const res = await savePlayManagerTicketPrice(999);
  assert.equal(res.success, true); // not rejected as invalid_ticket_price
  const { rows } = await db.query<{ ticket_price: number }>(
    `select ticket_price from pm_finance_state where team_id = $1`, [TEAM],
  );
  assert.ok(rows[0].ticket_price >= 10 && rows[0].ticket_price <= 80, `clamped into range, got ${rows[0].ticket_price}`);
});
