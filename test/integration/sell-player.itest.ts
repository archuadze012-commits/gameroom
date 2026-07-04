import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb, loadRpc } from '../harness/pglite-db.js';

// RPC-backed integration test for pm_sell_player's ownership guard: a team can
// only sell a player it owns. Confirms the PR2 finding (`where id = p_player_id
// and owner_id = p_team_id` → raise player_not_found) against a real engine.
// We exercise the rejection path only, which raises before touching pm_credit /
// pm_player_overall_from_stats, so a minimal pm_players table is enough.

let db: PGlite;

const OWNER = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

before(async () => {
  db = await bootTestDb();
  await db.exec(`
    create table public.pm_players (
      id uuid primary key default gen_random_uuid(),
      owner_id uuid,
      normalized_name text,
      current_transfer_value_gel bigint default 0
    );
  `);
  await loadRpc(db, 'pm_sell_player');
});

after(async () => {
  await db?.close();
});

test('a team cannot sell a player it does not own (player_not_found)', async () => {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.pm_players (owner_id, normalized_name) values ($1, 'x') returning id`,
    [OWNER],
  );
  const playerId = rows[0].id;

  await assert.rejects(
    () => db.query(`select public.pm_sell_player($1, $2)`, [OTHER, playerId]),
    /player_not_found/,
  );

  // The player still belongs to its real owner — nothing was released.
  const { rows: after } = await db.query<{ owner_id: string }>(
    `select owner_id from public.pm_players where id = $1`,
    [playerId],
  );
  assert.equal(after[0].owner_id, OWNER);
});

test('selling a non-existent player id is rejected too', async () => {
  await assert.rejects(
    () => db.query(`select public.pm_sell_player($1, $2)`, [OWNER, OTHER]),
    /player_not_found/,
  );
});
