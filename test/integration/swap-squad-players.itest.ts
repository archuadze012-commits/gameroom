import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb, loadRpc } from '../harness/pglite-db.js';

// RPC-backed test for pm_swap_squad_players against the real engine. The key
// thing to prove is that swapping player_id between two slots survives the
// unique(player_id) constraint on pm_squads — a two-step update would collide,
// the function's single-statement CASE update must not. Also covers the
// ownership guard and the same-slot / missing-slot rejections.

let db: PGlite;

const TEAM = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_TEAM = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

before(async () => {
  db = await bootTestDb();
  await db.exec(`
    create table public.pm_players (id uuid primary key default gen_random_uuid());
    create table public.pm_squads (
      id bigserial primary key,
      team_id uuid not null,
      player_id uuid not null references public.pm_players(id),
      position text not null default 'ST',
      shirt_number smallint,
      constraint pm_squads_player_uniq unique (player_id) deferrable initially immediate
    );
  `);
  await loadRpc(db, 'pm_swap_squad_players');
});

after(async () => {
  await db?.close();
});

// Two owned slots: one "active" (low id, shirt 5) and one "unassigned" (higher id).
async function seedTwoSlots(team = TEAM) {
  const { rows: p } = await db.query<{ id: string }>(
    `insert into public.pm_players default values returning id`,
  );
  const active = p[0].id;
  const { rows: p2 } = await db.query<{ id: string }>(
    `insert into public.pm_players default values returning id`,
  );
  const unassigned = p2[0].id;
  const { rows: s1 } = await db.query<{ id: number }>(
    `insert into public.pm_squads (team_id, player_id, shirt_number) values ($1,$2,5) returning id`,
    [team, active],
  );
  const { rows: s2 } = await db.query<{ id: number }>(
    `insert into public.pm_squads (team_id, player_id, shirt_number) values ($1,$2,null) returning id`,
    [team, unassigned],
  );
  return { activeSlot: s1[0].id, unassignedSlot: s2[0].id, activePlayer: active, unassignedPlayer: unassigned };
}

test('swaps the occupants of two owned slots (unique(player_id) survives)', async () => {
  const { activeSlot, unassignedSlot, activePlayer, unassignedPlayer } = await seedTwoSlots();

  await db.query(`select public.pm_swap_squad_players($1,$2,$3)`, [TEAM, activeSlot, unassignedSlot]);

  const { rows } = await db.query<{ id: number; player_id: string; shirt_number: number | null }>(
    `select id, player_id, shirt_number from public.pm_squads order by id`,
  );
  const active = rows.find((r) => r.id === activeSlot)!;
  const unassigned = rows.find((r) => r.id === unassignedSlot)!;
  // Occupants swapped; each slot kept its own shirt_number (lineup position).
  assert.equal(active.player_id, unassignedPlayer);
  assert.equal(active.shirt_number, 5);
  assert.equal(unassigned.player_id, activePlayer);
  assert.equal(unassigned.shirt_number, null);
});

test('rejects swapping a slot with itself (invalid_swap)', async () => {
  const { activeSlot } = await seedTwoSlots();
  await assert.rejects(
    () => db.query(`select public.pm_swap_squad_players($1,$2,$3)`, [TEAM, activeSlot, activeSlot]),
    /invalid_swap/,
  );
});

test('rejects when a slot is not owned by the team (player_not_found)', async () => {
  const { activeSlot, unassignedSlot, activePlayer, unassignedPlayer } = await seedTwoSlots();
  await assert.rejects(
    () => db.query(`select public.pm_swap_squad_players($1,$2,$3)`, [OTHER_TEAM, activeSlot, unassignedSlot]),
    /player_not_found/,
  );
  // Nothing moved.
  const { rows } = await db.query<{ id: number; player_id: string }>(
    `select id, player_id from public.pm_squads where id in ($1,$2)`,
    [activeSlot, unassignedSlot],
  );
  assert.equal(rows.find((r) => r.id === activeSlot)!.player_id, activePlayer);
  assert.equal(rows.find((r) => r.id === unassignedSlot)!.player_id, unassignedPlayer);
});
