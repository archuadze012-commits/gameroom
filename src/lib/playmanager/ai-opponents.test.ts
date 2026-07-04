import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  DEFAULT_PLAYMANAGER_OPPONENT,
  getPlayManagerFixtureOpponentRowOrder,
  getPlayManagerNextOpponent,
  PLAYMANAGER_AI_CLUBS,
} from './ai-opponents.js';

test('fixture order rotates through the seven AI clubs', () => {
  assert.deepEqual(
    Array.from({ length: 7 }, (_, playedMatches) => getPlayManagerFixtureOpponentRowOrder(playedMatches)),
    [8, 7, 6, 5, 4, 3, 2],
  );
});

test('next opponent follows the scheduled row order', () => {
  const rows = PLAYMANAGER_AI_CLUBS.map((club) => ({
    club_name: club.name,
    row_order: club.rowOrder,
  }));

  assert.equal(getPlayManagerNextOpponent(rows, 0), 'Liverpool AIFC');
  assert.equal(getPlayManagerNextOpponent(rows, 1), 'Barcelona AIFC');
  assert.equal(getPlayManagerNextOpponent(rows, 2), 'PSG AIFC');
  assert.equal(getPlayManagerNextOpponent(rows, 3), 'Real Madrid AIFC');
  assert.equal(getPlayManagerNextOpponent(rows, 4), 'Arsenal AIFC');
  assert.equal(getPlayManagerNextOpponent(rows, 5), 'Manchester United AIFC');
  assert.equal(getPlayManagerNextOpponent(rows, 6), 'AIFC Milan');
});

test('next opponent falls back to the scheduled default when rows are missing', () => {
  assert.equal(getPlayManagerNextOpponent([], 0), DEFAULT_PLAYMANAGER_OPPONENT);
});
