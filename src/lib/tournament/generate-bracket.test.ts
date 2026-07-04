import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  generateSingleElimBracket,
  type BracketMatch,
  type BracketParticipant,
} from './generate-bracket.js';

// Smoke coverage for the single-elimination bracket generator — the pure core
// that drives both cup and league draws (cups.ts / leagues.ts). Property-based
// assertions rather than literal snapshots so the tests survive seed-order
// tweaks but still guard the invariants that matter.

function makeParticipants(n: number): BracketParticipant[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i + 1}`,
    name: `Team ${i + 1}`,
    seed: i + 1,
  }));
}

function round1(matches: BracketMatch[]) {
  return matches.filter((m) => m.round === 1);
}

test('fewer than two participants yields an empty bracket', () => {
  assert.deepEqual(generateSingleElimBracket([]), { matches: [], rounds: 0 });
  assert.deepEqual(generateSingleElimBracket(makeParticipants(1)), { matches: [], rounds: 0 });
});

test('a power-of-two draw has the right shape and no byes', () => {
  const { matches, rounds } = generateSingleElimBracket(makeParticipants(8));
  assert.equal(rounds, 3);
  assert.equal(matches.length, 7); // 4 + 2 + 1
  assert.equal(round1(matches).length, 4);
  // No byes: every round-1 match is a real 'ready' tie with two players.
  for (const m of round1(matches)) {
    assert.ok(m.player1 && m.player2, 'round-1 match should be fully populated');
    assert.equal(m.status, 'ready');
  }
  // Exactly one final.
  assert.equal(matches.filter((m) => m.round === rounds).length, 1);
});

test('standard seeding pits the top seed against the bottom seed', () => {
  const { matches } = generateSingleElimBracket(makeParticipants(8));
  const topMatch = round1(matches).find(
    (m) => m.player1?.seed === 1 || m.player2?.seed === 1,
  );
  assert.ok(topMatch, 'seed #1 must appear in round 1');
  const opponent = topMatch!.player1?.seed === 1 ? topMatch!.player2 : topMatch!.player1;
  assert.equal(opponent?.seed, 8, 'seed #1 should face seed #8 in round 1');
});

test('every participant appears exactly once in round 1', () => {
  const { matches } = generateSingleElimBracket(makeParticipants(8));
  const ids = round1(matches)
    .flatMap((m) => [m.player1?.id, m.player2?.id])
    .filter(Boolean);
  assert.equal(ids.length, 8);
  assert.equal(new Set(ids).size, 8, 'no participant duplicated or missing');
});

test('nobody is ever drawn against themselves', () => {
  for (const n of [2, 3, 5, 6, 8, 11, 16]) {
    const { matches } = generateSingleElimBracket(makeParticipants(n));
    for (const m of matches) {
      if (m.player1 && m.player2) {
        assert.notEqual(m.player1.id, m.player2.id, `n=${n}: self-match at r${m.round}p${m.position}`);
      }
    }
  }
});

test('non-power-of-two draws pad with byes that auto-advance the top seeds', () => {
  const { matches, rounds } = generateSingleElimBracket(makeParticipants(5));
  assert.equal(rounds, 3); // padded up to a bracket of 8
  // 8 - 5 = 3 byes: round-1 matches with exactly one player, auto-won, completed.
  const byes = round1(matches).filter((m) => !m.player1 !== !m.player2);
  assert.equal(byes.length, 3);
  for (const bye of byes) {
    assert.ok(bye.winner, 'a bye must auto-advance its lone participant');
    assert.equal(bye.status, 'completed');
  }
});

test('two byes feeding the same slot keep it playable (no deadlock)', () => {
  // Participant counts 5, 9, 10, 11… can produce a round-2 slot fed by two
  // round-1 byes. That slot must be 'ready', not stuck 'pending', or the bracket
  // deadlocks. Regression guard for that exact case.
  for (const n of [5, 9, 10, 11]) {
    const { matches } = generateSingleElimBracket(makeParticipants(n));
    const bothByesReady = matches.some(
      (m) => m.round === 2 && m.status === 'ready' && m.player1 && m.player2,
    );
    assert.ok(bothByesReady, `n=${n}: expected a round-2 slot pre-filled by two byes to be 'ready'`);
  }
});
