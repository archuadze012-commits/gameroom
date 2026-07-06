import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb, loadRpc } from '../harness/pglite-db.js';

// RPC-backed HAPPY-PATH integration test for pm_train_player's XP-budget model
// (the stat-gain that runs after the once-per-match gate). Full closure — driving
// the real budget/cost loop: carry leftover xp, add the session grant, buy focus-
// stat points while the budget covers them, always bank leftover xp + charge
// fatigue/morale and stamp last_train_match with the current match count. (The
// per-cycle training-quota model this once asserted was stale drift — production
// runs once-per-match; see training-once-per-match.itest.ts.)

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
      xp integer default 0, fatigue integer default 10, morale integer default 50,
      last_train_match integer
    );
    create table public.pm_squads (id bigint generated always as identity primary key, team_id uuid, player_id uuid, position text);
    create table public.pm_staff (team_id uuid, role_key text, level integer);
    create table public.pm_match_history (id bigint generated always as identity primary key, team_id uuid);
    create table public.pm_cup_matches (id bigint generated always as identity primary key, status text, team1_id uuid, team2_id uuid);
  `);
  for (const fn of [
    'pm_player_stat_labels',
    'pm_player_ovr_growth_cap',
    'pm_player_seed_card_stats',
    'pm_player_overall_from_stats',
    'pm_player_training_focus',
    'pm_team_match_count',
    'pm_train_player',
  ]) {
    await loadRpc(db, fn);
  }
});

after(async () => { await db?.close(); });

// A fresh, trainable ST (ovr 60 / talent 5 → cap 71) that has never trained,
// with one match played so it is eligible under the once-per-match gate.
async function seedPlayer(xp: number): Promise<string> {
  await db.exec(`truncate pm_players, pm_squads, pm_staff, pm_match_history, pm_cup_matches;`);
  await db.query(`insert into pm_match_history (team_id) values ($1)`, [TEAM]); // 1 match played
  const { rows } = await db.query<{ id: string }>(
    `insert into pm_players (owner_id, xp, fatigue, morale) values ($1,$2,10,50) returning id`,
    [TEAM, String(xp)],
  );
  const id = rows[0].id;
  await db.query(`insert into pm_squads (team_id, player_id, position) values ($1,$2,'ST')`, [TEAM, id]);
  return id;
}

type TrainResult = {
  statGain: number; improvedStats: string[]; xpGranted: number; xpBanked: number;
  pendingOvr: number; ovrCurrent: number; matchesPlayed: number;
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
  assert.equal(r.matchesPlayed, 1);

  const { rows } = await db.query<{ xp: number; fatigue: number; morale: number; last_train_match: number; pending_card_stats: unknown }>(
    `select xp, fatigue, morale, last_train_match, pending_card_stats from pm_players where id = $1`, [id],
  );
  assert.equal(rows[0].xp, 25);
  assert.equal(rows[0].fatigue, 18); // +8
  assert.equal(rows[0].morale, 53); // +3
  assert.equal(rows[0].last_train_match, 1); // stamped with the current match count
  assert.notEqual(rows[0].pending_card_stats, null);
});

test('a full budget buys focus-stat points and lifts the pending OVR', async () => {
  const id = await seedPlayer(500);
  const r = await train(id);

  assert.ok(r.statGain >= 1, `expected at least one stat point, got ${r.statGain}`);
  assert.ok(r.improvedStats.length >= 1, 'improved stats are reported');
  assert.ok(r.pendingOvr >= r.ovrCurrent, 'pending OVR does not drop');
  assert.ok(r.xpBanked < 525, 'budget was partly spent'); // 500 + 25 grant
  assert.equal(r.matchesPlayed, 1);

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
