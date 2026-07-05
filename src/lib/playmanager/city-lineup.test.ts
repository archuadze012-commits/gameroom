import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  canFillRole,
  normalizePosition,
  pickBestLineup,
  pickPersistedLineup,
  FORMATION_433_TARGETS,
} from './city-lineup.js';
import type { BaseSquadPlayer } from './city-data.types.js';

// Coverage for the lineup selection logic extracted from city-data.ts. These are
// pure functions, so the tests are property/behaviour assertions rather than
// snapshots: the 4-3-3 auto-pick, its OVR-then-fatigue tiebreak, the bench/
// reserve split, and the slot-driven persisted layout.

let nextId = 0;
function player(overrides: Partial<BaseSquadPlayer> & { position: string; ovrCurrent: number }): BaseSquadPlayer {
  nextId += 1;
  return {
    squadId: nextId,
    id: `p${nextId}`,
    normalizedName: `player-${nextId}`,
    name: `Player ${nextId}`,
    age: 24,
    ovrBase: overrides.ovrCurrent,
    value: 0,
    valueLabel: '0',
    fatigue: 0,
    morale: 100,
    injuryMatches: 0,
    availability: 'ready',
    lineupSlot: null,
    talent: 8,
    squadNumber: null,
    ...overrides,
  };
}

// A full, position-correct 4-3-3 plus extras, so pickBestLineup can fill every slot.
function full433Squad(): BaseSquadPlayer[] {
  return [
    player({ position: 'GK', ovrCurrent: 80 }),
    player({ position: 'LB', ovrCurrent: 78 }),
    player({ position: 'CB', ovrCurrent: 82 }),
    player({ position: 'CB', ovrCurrent: 81 }),
    player({ position: 'RB', ovrCurrent: 77 }),
    player({ position: 'CDM', ovrCurrent: 79 }),
    player({ position: 'CM', ovrCurrent: 83 }),
    player({ position: 'CM', ovrCurrent: 80 }),
    player({ position: 'LW', ovrCurrent: 84 }),
    player({ position: 'ST', ovrCurrent: 86 }),
    player({ position: 'RW', ovrCurrent: 85 }),
    // extras → bench/reserve
    player({ position: 'ST', ovrCurrent: 75 }),
    player({ position: 'CB', ovrCurrent: 74 }),
    player({ position: 'CM', ovrCurrent: 73 }),
    player({ position: 'GK', ovrCurrent: 70 }),
    player({ position: 'LW', ovrCurrent: 72 }),
  ];
}

test('normalizePosition collapses side-specific labels to their base role', () => {
  assert.equal(normalizePosition('lcb'), 'CB');
  assert.equal(normalizePosition('RCB'), 'CB');
  assert.equal(normalizePosition('LCM'), 'CM');
  assert.equal(normalizePosition('LWB'), 'LB');
  assert.equal(normalizePosition('RWB'), 'RB');
  assert.equal(normalizePosition('st'), 'ST');
});

test('canFillRole honours exact matches and the allowed cross-position fallbacks', () => {
  assert.equal(canFillRole('ST', 'ST'), true);
  assert.equal(canFillRole('CB', 'LB'), true); // a CB can cover full-back
  assert.equal(canFillRole('CM', 'CDM'), true);
  assert.equal(canFillRole('CAM', 'ST'), true);
  assert.equal(canFillRole('LW', 'RW'), true); // wingers are interchangeable
  assert.equal(canFillRole('GK', 'CB'), false);
  assert.equal(canFillRole('ST', 'GK'), false);
});

test('pickBestLineup fills all 11 slots of the 4-3-3 with exactly one keeper', () => {
  const { starters, bench, reserves, squad } = pickBestLineup(full433Squad());
  assert.equal(starters.length, 11);
  assert.equal(bench.length, 4);
  assert.equal(reserves.length, 1); // 16 players − 11 − 4
  assert.equal(squad.length, 16);
  assert.equal(starters.filter((p) => p.position === 'GK').length, 1);
  // Slots are assigned in formation order 1..11.
  assert.deepEqual(starters.map((p) => p.lineupSlot), FORMATION_433_TARGETS.map((_, i) => i + 1));
  // Every starter is flagged; bench sit in slots 12..15; reserves have no slot.
  assert.ok(starters.every((p) => p.role === 'starter'));
  assert.deepEqual(bench.map((p) => p.lineupSlot), [12, 13, 14, 15]);
  assert.ok(reserves.every((p) => p.role === 'reserve' && p.lineupSlot === null));
});

test('pickBestLineup prefers the higher-OVR candidate for a contested slot', () => {
  const squad = [
    player({ position: 'GK', ovrCurrent: 70 }),
    player({ position: 'ST', ovrCurrent: 88 }),
    player({ position: 'ST', ovrCurrent: 90 }), // should win the ST slot
  ];
  const { starters } = pickBestLineup(squad);
  const st = starters.find((p) => p.lineupSlot === FORMATION_433_TARGETS.indexOf('ST') + 1);
  assert.ok(st);
  assert.equal(st.ovrCurrent, 90);
});

test('pickBestLineup breaks an OVR tie by lower fatigue', () => {
  const squad = [
    player({ position: 'GK', ovrCurrent: 70 }),
    player({ position: 'ST', ovrCurrent: 85, fatigue: 60 }),
    player({ position: 'ST', ovrCurrent: 85, fatigue: 10 }), // fresher → picked
  ];
  const { starters } = pickBestLineup(squad);
  const st = starters.find((p) => p.position === 'ST' && p.role === 'starter');
  assert.ok(st);
  assert.equal(st.fatigue, 10);
});

test('pickPersistedLineup splits by saved slot: 1-11 start, 12-15 bench, rest reserve', () => {
  const squad = [
    player({ position: 'GK', ovrCurrent: 80, lineupSlot: 1 }),
    player({ position: 'ST', ovrCurrent: 86, lineupSlot: 11 }),
    player({ position: 'CM', ovrCurrent: 75, lineupSlot: 13 }),
    player({ position: 'CB', ovrCurrent: 74, lineupSlot: 20 }),
    player({ position: 'LW', ovrCurrent: 72, lineupSlot: null }),
  ];
  const { starters, bench, reserves } = pickPersistedLineup(squad);
  assert.deepEqual(starters.map((p) => p.lineupSlot), [1, 11]);
  assert.ok(starters.every((p) => p.role === 'starter'));
  assert.deepEqual(bench.map((p) => p.lineupSlot), [13]);
  assert.equal(reserves.length, 2); // slot 20 + the null-slot player
  assert.ok(reserves.every((p) => p.role === 'reserve'));
});
