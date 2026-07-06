import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb, loadRpc } from '../harness/pglite-db.js';

// RPC-backed integration test for pm_train_player's gating guards under the
// PRODUCTION once-per-match model: you can only train your own, available
// player, and only ONCE per match the team has played — a second train before
// another match raises already_trained_this_match. (Production replaced the
// older per-cycle training-quota model; the migration files had drifted to the
// stale quota body until the 20260723/24 drift reconciliation restored the live
// once-per-match body. pm_team_match_count counts pm_match_history rows plus
// completed pm_cup_matches.)

let db: PGlite;

const TEAM = 'dddddddd-0000-0000-0000-000000000001';
const OTHER = 'eeeeeeee-0000-0000-0000-000000000002';

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

after(async () => {
  await db?.close();
});

// A fresh ST (ovr 60 / talent 5 → cap 71, not maxed) in TEAM's squad. `matches`
// seeds that many played matches (via pm_match_history); `lastTrainMatch` sets
// the player's last-trained marker. Returns the player id.
async function seedPlayer(
  o: { status?: string; injuryMatches?: number; squadTeam?: string; matches?: number; lastTrainMatch?: number | null } = {},
): Promise<string> {
  await db.exec(`truncate pm_players, pm_squads, pm_staff, pm_match_history, pm_cup_matches;`);
  for (let i = 0; i < (o.matches ?? 0); i += 1) {
    await db.query(`insert into pm_match_history (team_id) values ($1)`, [TEAM]);
  }
  const { rows } = await db.query<{ id: string }>(
    `insert into pm_players (owner_id, status, injury_matches, primary_position, ovr_current, ovr_base, talent, last_train_match)
     values ($1,$2,$3,'ST',60,60,5,$4) returning id`,
    [TEAM, o.status ?? 'active', o.injuryMatches ?? 0, o.lastTrainMatch ?? null],
  );
  const id = rows[0].id;
  await db.query(`insert into pm_squads (team_id, player_id, position) values ($1,$2,'ST')`, [o.squadTeam ?? TEAM, id]);
  return id;
}

test('cannot train a player not in your squad (player_not_found)', async () => {
  const id = await seedPlayer({ squadTeam: OTHER });
  await assert.rejects(
    () => db.query(`select public.pm_train_player($1, $2)`, [TEAM, id]),
    /player_not_found/,
  );
});

test('cannot train an injured player (player_unavailable)', async () => {
  const id = await seedPlayer({ injuryMatches: 2 });
  await assert.rejects(
    () => db.query(`select public.pm_train_player($1, $2)`, [TEAM, id]),
    /player_unavailable/,
  );
});

test('cannot train twice for the same match (already_trained_this_match)', async () => {
  // 3 matches played and the player already trained at match count 3 → blocked
  // until the team plays another match.
  const id = await seedPlayer({ matches: 3, lastTrainMatch: 3 });
  await assert.rejects(
    () => db.query(`select public.pm_train_player($1, $2)`, [TEAM, id]),
    /already_trained_this_match/,
  );
});

test('training is allowed again once a new match is played', async () => {
  // Trained at match 2, but 3 matches are now played (2 !== 3) → training runs
  // and advances the marker to the current match count.
  const id = await seedPlayer({ matches: 3, lastTrainMatch: 2 });
  const { rows } = await db.query<{ r: { matchesPlayed: number } }>(
    `select public.pm_train_player($1, $2) as r`,
    [TEAM, id],
  );
  assert.equal(rows[0].r.matchesPlayed, 3);
  const { rows: p } = await db.query<{ last_train_match: number }>(
    `select last_train_match from pm_players where id = $1`,
    [id],
  );
  assert.equal(p[0].last_train_match, 3, 'marker advances so an immediate re-train is blocked');
});
