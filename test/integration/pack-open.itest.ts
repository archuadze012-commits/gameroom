import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb, loadRpc } from '../harness/pglite-db.js';

// RPC-backed integration test for pack opening. Runs the real closure —
// pm_open_pack -> pm_debit + pm_player_career_end_age (3 functions, 6 tables):
// draws N free-pool players by rarity weight, assigns them to the team + squad,
// debits the cost, writes the opening. Covers the happy path, an unknown pack,
// the money-first insufficient-funds rollback, and pool exhaustion.

let db: PGlite;

const TEAM = 'cccccccc-0000-0000-0000-000000000001';

before(async () => {
  db = await bootTestDb();
  await db.exec(`
    create table public.pm_wallets (team_id uuid primary key, balance bigint not null default 0);
    create table public.pm_transactions (
      id uuid primary key default gen_random_uuid(),
      team_id uuid, amount bigint, reason text, created_at timestamptz default now()
    );
    create table public.pm_packs (
      id integer primary key,
      cost_pm bigint default 0,
      player_count integer default 5,
      rarity_weights jsonb default '{"1":1}'::jsonb
    );
    create table public.pm_players (
      id uuid primary key default gen_random_uuid(),
      owner_id uuid,
      status text default 'active',
      talent integer default 1,
      pending_repack boolean default false,
      age integer,
      career_end_age smallint,
      primary_position text default 'CM'
    );
    create table public.pm_squads (
      team_id uuid, player_id uuid unique, position text
    );
    create table public.pm_pack_openings (
      id uuid primary key default gen_random_uuid(),
      team_id uuid, pack_id integer, players_received uuid[]
    );
  `);
  for (const fn of ['pm_credit', 'pm_debit', 'pm_player_career_end_age', 'pm_open_pack']) {
    await loadRpc(db, fn);
  }
});

after(async () => {
  await db?.close();
});

// Reset + seed one pack and a fresh free-agent pool of talent-1 players.
async function seed(opts: { balance: number; cost: number; playerCount: number; poolSize: number }) {
  await db.exec(`truncate pm_wallets, pm_transactions, pm_packs, pm_players, pm_squads, pm_pack_openings;`);
  await db.query(`insert into pm_wallets (team_id, balance) values ($1,$2)`, [TEAM, String(opts.balance)]);
  await db.query(`insert into pm_packs (id, cost_pm, player_count, rarity_weights) values (1,$1,$2,'{"1":1}'::jsonb)`, [
    String(opts.cost), String(opts.playerCount),
  ]);
  for (let i = 0; i < opts.poolSize; i++) {
    await db.query(`insert into pm_players (owner_id, status, talent, primary_position) values (null,'active',1,'ST')`, []);
  }
}

const one = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0];

test('opening a pack assigns players, debits cost, and records the opening', async () => {
  await seed({ balance: 5000, cost: 500, playerCount: 3, poolSize: 10 });

  const res = await one<{ r: { count: number; cost: string; packId: number } }>(
    `select public.pm_open_pack($1, 1) as r`,
    [TEAM],
  );
  assert.equal(res.r.count, 3);
  assert.equal(Number(res.r.cost), 500);

  // Three free agents now belong to the team and sit in its squad.
  const owned = await one<{ c: string }>(`select count(*)::int c from pm_players where owner_id=$1`, [TEAM]);
  assert.equal(Number(owned.c), 3);
  const squad = await one<{ c: string }>(`select count(*)::int c from pm_squads where team_id=$1`, [TEAM]);
  assert.equal(Number(squad.c), 3);
  // They were dealt an age + career window on the way in.
  const shaped = await one<{ c: string }>(
    `select count(*)::int c from pm_players where owner_id=$1 and age=18 and career_end_age is not null`,
    [TEAM],
  );
  assert.equal(Number(shaped.c), 3);

  // Cost left the wallet; one opening row was written.
  const wallet = await one<{ balance: string }>(`select balance from pm_wallets where team_id=$1`, [TEAM]);
  assert.equal(Number(wallet.balance), 4500);
  const openings = await one<{ c: string }>(`select count(*)::int c from pm_pack_openings where team_id=$1`, [TEAM]);
  assert.equal(Number(openings.c), 1);
});

test('opening an unknown pack is rejected (pack_not_found)', async () => {
  await seed({ balance: 5000, cost: 500, playerCount: 3, poolSize: 10 });
  await assert.rejects(
    () => db.query(`select public.pm_open_pack($1, 999)`, [TEAM]),
    /pack_not_found/,
  );
});

test('an unaffordable pack rolls back — no players, no opening, no charge', async () => {
  await seed({ balance: 100, cost: 500, playerCount: 3, poolSize: 10 });
  await assert.rejects(
    () => db.query(`select public.pm_open_pack($1, 1)`, [TEAM]),
    /insufficient_funds/,
  );
  const owned = await one<{ c: string }>(`select count(*)::int c from pm_players where owner_id=$1`, [TEAM]);
  assert.equal(Number(owned.c), 0);
  const openings = await one<{ c: string }>(`select count(*)::int c from pm_pack_openings where team_id=$1`, [TEAM]);
  assert.equal(Number(openings.c), 0);
  const wallet = await one<{ balance: string }>(`select balance from pm_wallets where team_id=$1`, [TEAM]);
  assert.equal(Number(wallet.balance), 100);
});

test('a pack drains only what the free pool has left', async () => {
  await seed({ balance: 5000, cost: 0, playerCount: 5, poolSize: 2 });
  const res = await one<{ r: { count: number } }>(`select public.pm_open_pack($1, 1) as r`, [TEAM]);
  assert.equal(res.r.count, 2); // pool exhausted at 2, loop stops
  const owned = await one<{ c: string }>(`select count(*)::int c from pm_players where owner_id=$1`, [TEAM]);
  assert.equal(Number(owned.c), 2);
});
