import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb, loadRpc } from '../harness/pglite-db.js';

// RPC-backed integration test for the training-quota guard. Runs the real
// pm_train_player pre-quota closure (pm_player_ovr_growth_cap,
// pm_player_seed_card_stats, pm_player_overall_from_stats, pm_ensure_calendar,
// pm_training_capacity; 6 functions, 5 tables) and asserts the gameplay guards:
// you can only train your own, available player, and only up to the per-cycle
// training capacity (4 + head_coach level + training-facility level).
//
// The happy-path stat-gain that runs AFTER the quota check pulls in the whole
// XP-budget model, so this suite covers the guards; extend with those functions
// to assert an actual stat gain.

let db: PGlite;

const TEAM = 'dddddddd-0000-0000-0000-000000000001';
const OTHER = 'eeeeeeee-0000-0000-0000-000000000002';

before(async () => {
  db = await bootTestDb();
  await db.exec(`
    create table public.pm_players (
      id uuid primary key default gen_random_uuid(),
      owner_id uuid,
      status text default 'active',
      injury_matches integer default 0,
      primary_position text default 'ST',
      ovr_current smallint default 60,
      ovr_base smallint default 60,
      talent smallint default 5,
      pending_card_stats jsonb,
      card_stats jsonb,
      base_card_stats jsonb,
      xp integer default 0
    );
    create table public.pm_squads (
      id bigint generated always as identity primary key,
      team_id uuid, player_id uuid, position text
    );
    create table public.pm_staff (team_id uuid, role_key text, level integer);
    create table public.pm_facilities (team_id uuid, sprite_key text, level integer);
    create table public.pm_calendar (
      team_id uuid primary key,
      total_days integer not null default 1,
      train_used smallint default 0,
      train_day integer
    );
  `);
  for (const fn of [
    'pm_player_stat_labels',
    'pm_player_ovr_growth_cap',
    'pm_player_seed_card_stats',
    'pm_player_overall_from_stats',
    'pm_ensure_calendar',
    'pm_training_capacity',
    'pm_train_player',
  ]) {
    await loadRpc(db, fn);
  }
});

after(async () => {
  await db?.close();
});

// A fresh player in TEAM's squad (owned, active, ovr 60 / talent 5 → cap 71, so
// not maxed). Returns the player id.
async function seedPlayer(overrides: { status?: string; injuryMatches?: number; squadTeam?: string } = {}) {
  await db.exec(`truncate pm_players, pm_squads, pm_staff, pm_facilities, pm_calendar;`);
  const { rows } = await db.query<{ id: string }>(
    `insert into pm_players (owner_id, status, injury_matches, primary_position, ovr_current, ovr_base, talent)
     values ($1,$2,$3,'ST',60,60,5) returning id`,
    [TEAM, overrides.status ?? 'active', overrides.injuryMatches ?? 0],
  );
  const playerId = rows[0].id;
  await db.query(`insert into pm_squads (team_id, player_id, position) values ($1,$2,'ST')`, [
    overrides.squadTeam ?? TEAM, playerId,
  ]);
  return playerId;
}

test('cannot train a player not in your squad (player_not_found)', async () => {
  const playerId = await seedPlayer({ squadTeam: OTHER });
  await assert.rejects(
    () => db.query(`select public.pm_train_player($1, $2)`, [TEAM, playerId]),
    /player_not_found/,
  );
});

test('cannot train an injured player (player_unavailable)', async () => {
  const playerId = await seedPlayer({ injuryMatches: 2 });
  await assert.rejects(
    () => db.query(`select public.pm_train_player($1, $2)`, [TEAM, playerId]),
    /player_unavailable/,
  );
});

test('training is blocked once the per-cycle capacity is used up (training_quota_reached)', async () => {
  const playerId = await seedPlayer();
  // No head_coach / training facility → capacity = 4. Mark this cycle's quota
  // fully spent (train_day == total_days so it is not reset).
  await db.query(
    `insert into pm_calendar (team_id, total_days, train_used, train_day) values ($1, 10, 4, 10)`,
    [TEAM],
  );
  await assert.rejects(
    () => db.query(`select public.pm_train_player($1, $2)`, [TEAM, playerId]),
    /training_quota_reached/,
  );
});

test('capacity scales with head coach + training facility levels', async () => {
  const playerId = await seedPlayer();
  // 4 base + head_coach L2 + training facility L3 = capacity 9; 8 used < 9 means
  // the quota guard must NOT fire (the session proceeds past it).
  await db.query(`insert into pm_staff (team_id, role_key, level) values ($1,'head_coach',2)`, [TEAM]);
  await db.query(`insert into pm_facilities (team_id, sprite_key, level) values ($1,'training',3)`, [TEAM]);
  await db.query(`insert into pm_calendar (team_id, total_days, train_used, train_day) values ($1, 10, 8, 10)`, [TEAM]);
  await assert.doesNotReject(
    async () => {
      try {
        await db.query(`select public.pm_train_player($1, $2)`, [TEAM, playerId]);
      } catch (err) {
        // The post-quota XP-budget helpers aren't loaded in this suite, so the
        // call may fail LATER — but it must not be the quota guard.
        assert.doesNotMatch(String(err), /training_quota_reached/);
      }
    },
  );
});
