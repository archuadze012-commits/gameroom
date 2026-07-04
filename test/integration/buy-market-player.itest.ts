import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb, loadRpc } from '../harness/pglite-db.js';

// RPC-backed test proving the mechanism the market-buy fix relies on:
// pm_buy_market_player claims the EXISTING unowned pm_players row by
// normalized_name — for ANY player, not just the four static seed targets — so
// the free-agent market (which shows thousands of DB players) is actually
// buyable. It must claim the existing row, not mint a duplicate.

let db: PGlite;

const TEAM = '77770000-0000-0000-0000-000000000001';
const OTHER = '88880000-0000-0000-0000-000000000002';

before(async () => {
  db = await bootTestDb();
  await db.exec(`
    create table public.pm_wallets (team_id uuid primary key, balance bigint default 0);
    create table public.pm_transactions (id uuid primary key default gen_random_uuid(), team_id uuid, amount bigint, reason text);
    create table public.pm_calendar (team_id uuid primary key, total_days integer default 1);
    create table public.pm_players (
      id uuid primary key default gen_random_uuid(),
      normalized_name text, display_name text, is_real boolean default true,
      talent smallint, ea_fc_ovr smallint, ovr_source text, ovr_base smallint, ovr_current smallint,
      age smallint, age_started_total_days integer, career_end_age smallint,
      base_transfer_value_gel bigint, current_transfer_value_gel bigint,
      primary_position text, status text default 'active', owner_id uuid,
      card_stats jsonb, base_card_stats jsonb, pending_repack boolean default false
    );
    create unique index pm_players_real_name_uk on public.pm_players (normalized_name) where is_real;
    create table public.pm_squads (id bigint generated always as identity primary key, team_id uuid, player_id uuid unique, position text);
  `);
  for (const fn of ['pm_debit', 'pm_ensure_calendar', 'pm_player_stat_labels', 'pm_player_career_end_age', 'pm_player_overall_from_stats', 'pm_buy_market_player']) {
    await loadRpc(db, fn);
  }
});

after(async () => { await db?.close(); });

// Seed a real, unowned free agent that is NOT one of the static MARKET_TARGETS.
async function seedFreeAgent(name: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into pm_players (normalized_name, display_name, is_real, talent, ea_fc_ovr, ovr_source, ovr_base, ovr_current, age, current_transfer_value_gel, primary_position, base_card_stats)
     values ($1, $2, true, 9, 88, 'ea_fc', 88, 88, 24, 5000, 'ST', '{"PAC":90,"SHO":91,"PAS":70,"DRI":82,"DEF":45,"PHY":88}'::jsonb)
     returning id`,
    [name, 'Erling Haaland'],
  );
  return rows[0].id;
}

const payload = (name: string) => ({
  normalized_name: name, display_name: 'Erling Haaland', position: 'ST', is_real: true,
  talent: 9, ea_fc_ovr: 88, ovr_source: 'ea_fc', ovr_base: 88, ovr_current: 88, age: 24,
  current_transfer_value_gel: 5000,
});

test('buying a non-seed free agent claims the existing DB row (no duplicate)', async () => {
  await db.exec(`truncate pm_wallets, pm_transactions, pm_calendar, pm_players, pm_squads;`);
  await db.query(`insert into pm_wallets (team_id, balance) values ($1, 100000)`, [TEAM]);
  const id = await seedFreeAgent('erling_haaland');

  const { rows } = await db.query<{ r: { playerId: string; cost: number } }>(
    `select public.pm_buy_market_player($1, $2) as r`, [TEAM, JSON.stringify(payload('erling_haaland'))],
  );
  assert.equal(rows[0].r.playerId, id, 'claims the exact existing row, not a fresh mint');

  // Still exactly one Haaland — the row was claimed, not duplicated.
  const { rows: cnt } = await db.query<{ c: string }>(`select count(*)::int c from pm_players where normalized_name='erling_haaland'`);
  assert.equal(Number(cnt[0].c), 1);
  // Now owned by the buyer + in their squad, and the wallet was charged.
  const { rows: p } = await db.query<{ owner_id: string }>(`select owner_id from pm_players where id=$1`, [id]);
  assert.equal(p[0].owner_id, TEAM);
  const { rows: sq } = await db.query<{ c: string }>(`select count(*)::int c from pm_squads where team_id=$1 and player_id=$2`, [TEAM, id]);
  assert.equal(Number(sq[0].c), 1);
  const { rows: w } = await db.query<{ balance: string }>(`select balance from pm_wallets where team_id=$1`, [TEAM]);
  assert.equal(Number(w[0].balance), 95000);
});

test('buying a player already owned by someone else is rejected', async () => {
  await db.exec(`truncate pm_wallets, pm_transactions, pm_calendar, pm_players, pm_squads;`);
  await db.query(`insert into pm_wallets (team_id, balance) values ($1, 100000)`, [TEAM]);
  const id = await seedFreeAgent('erling_haaland');
  await db.query(`update pm_players set owner_id=$1 where id=$2`, [OTHER, id]);

  await assert.rejects(
    () => db.query(`select public.pm_buy_market_player($1, $2)`, [TEAM, JSON.stringify(payload('erling_haaland'))]),
    /player_unavailable/,
  );
});
