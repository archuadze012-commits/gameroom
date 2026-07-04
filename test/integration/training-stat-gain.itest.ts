import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb, loadRpc } from '../harness/pglite-db.js';

// RPC-backed HAPPY-PATH integration test for pm_train_player's XP-budget model
// (the stat-gain that runs after the quota guard). Full closure — 8 functions,
// 5 tables — driving the real budget/cost loop: carry leftover xp, add the
// session grant, buy focus-stat points while the budget covers them, always
// bank leftover xp + charge fatigue/morale and a quota slot.

let db: PGlite;

const TEAM = 'ffff0000-0000-0000-0000-000000000001';

before(async () => {
  db = await bootTestDb();
  await db.exec(`
    create table public.pm_players (
      id uuid primary key default gen_random_uuid(),
      owner_id uuid, status text default 'active', injury_matches integer default 0,
      primary_position text default 'ST', ovr_current smallint default 60, ovr_base smallint default 60,
      talent smallint default 5, pending_card_stats jsonb, card_stats jsonb, base_card_stats jsonb,
      xp integer default 0, fatigue integer default 10, morale integer default 50
    );
    create table public.pm_squads (id bigint generated always as identity primary key, team_id uuid, player_id uuid, position text);
    create table public.pm_staff (team_id uuid, role_key text, level integer);
    create table public.pm_facilities (team_id uuid, sprite_key text, level integer);
    create table public.pm_calendar (team_id uuid primary key, total_days integer not null default 1, train_used smallint default 0, train_day integer);
  `);
  for (const fn of [
    'pm_player_stat_labels',
    'pm_player_ovr_growth_cap',
    'pm_player_seed_card_stats',
    'pm_player_overall_from_stats',
    'pm_player_training_focus',
    'pm_ensure_calendar',
    'pm_training_capacity',
    'pm_train_player',
  ]) {
    await loadRpc(db, fn);
  }
});

after(async () => { await db?.close(); });

// A fresh, trainable ST (ovr 60 / talent 5 → cap 71). Quota reset to a fresh
// cycle (train_used 0 < capacity 4). Returns the player id.
async function seedPlayer(xp: number): Promise<string> {
  await db.exec(`truncate pm_players, pm_squads, pm_staff, pm_facilities, pm_calendar;`);
  const { rows } = await db.query<{ id: string }>(
    `insert into pm_players (owner_id, xp, fatigue, morale) values ($1,$2,10,50) returning id`,
    [TEAM, String(xp)],
  );
  const id = rows[0].id;
  await db.query(`insert into pm_squads (team_id, player_id, position) values ($1,$2,'ST')`, [TEAM, id]);
  await db.query(`insert into pm_calendar (team_id, total_days, train_used, train_day) values ($1,1,0,1)`, [TEAM]);
  return id;
}

type TrainResult = {
  statGain: number; improvedStats: string[]; xpGranted: number; xpBanked: number;
  pendingOvr: number; ovrCurrent: number; trainUsed: number; trainCapacity: number;
};
async function train(id: string): Promise<TrainResult> {
  const { rows } = await db.query<{ r: TrainResult }>(`select public.pm_train_player($1,$2) as r`, [TEAM, id]);
  return rows[0].r;
}

test('a poor budget banks the session XP without buying a point', async () => {
  const id = await seedPlayer(0);
  const r = await train(id);

  assert.equal(r.xpGranted, 25); // base grant, no staff coach
  assert.equal(r.statGain, 0); // 25 xp can't afford a ~150+ point yet
  assert.deepEqual(r.improvedStats, []);
  assert.equal(r.xpBanked, 25); // carried forward
  assert.equal(r.trainUsed, 1); // a quota slot was spent
  assert.equal(r.trainCapacity, 4);

  const { rows } = await db.query<{ xp: number; fatigue: number; morale: number; pending_card_stats: unknown }>(
    `select xp, fatigue, morale, pending_card_stats from pm_players where id = $1`, [id],
  );
  assert.equal(rows[0].xp, 25);
  assert.equal(rows[0].fatigue, 18); // +8
  assert.equal(rows[0].morale, 53); // +3
  assert.notEqual(rows[0].pending_card_stats, null);

  const { rows: cal } = await db.query<{ train_used: number }>(`select train_used from pm_calendar where team_id=$1`, [TEAM]);
  assert.equal(cal[0].train_used, 1);
});

test('a full budget buys focus-stat points and lifts the pending OVR', async () => {
  const id = await seedPlayer(500);
  const r = await train(id);

  assert.ok(r.statGain >= 1, `expected at least one stat point, got ${r.statGain}`);
  assert.ok(r.improvedStats.length >= 1, 'improved stats are reported');
  assert.ok(r.pendingOvr >= r.ovrCurrent, 'pending OVR does not drop');
  assert.ok(r.xpBanked < 525, 'budget was partly spent'); // 500 + 25 grant
  assert.equal(r.trainUsed, 1);

  // The bought points persist as pending stats + banked leftover xp.
  const { rows } = await db.query<{ xp: number }>(`select xp from pm_players where id = $1`, [id]);
  assert.equal(rows[0].xp, r.xpBanked);
});

test('training respects the OVR growth cap (never overshoots)', async () => {
  // A huge budget still cannot push pending OVR past ovr_base + growth cap.
  const id = await seedPlayer(100000);
  const r = await train(id);
  const cap = 60 + 11; // ovr_base 60 + growth_cap(talent 5)=11
  assert.ok(r.pendingOvr <= cap, `pending OVR ${r.pendingOvr} must stay <= ${cap}`);
});
