import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  LISTING_STATUS,
  OFFER_STATUS,
  MATCH_STATUS,
  COMPETITION_STATUS,
  PLAYER_STATUS,
} from './status.js';

// Locks the status vocabularies to their DB CHECK constraints. If a migration
// changes the allowed values, update both the migration and this test together.

const values = <T extends Record<string, string>>(o: T) => Object.values(o).sort();

test('status vocabularies match their DB constraints', () => {
  assert.deepEqual(values(LISTING_STATUS), ['active', 'cancelled', 'sold']);
  assert.deepEqual(values(OFFER_STATUS), ['accepted', 'cancelled', 'pending', 'rejected']);
  assert.deepEqual(values(MATCH_STATUS), ['completed', 'pending', 'processing', 'ready']);
  assert.deepEqual(values(COMPETITION_STATUS), ['completed', 'in_progress', 'registration']);
  assert.deepEqual(values(PLAYER_STATUS), ['active', 'injured', 'retired']);
});

test('each key maps to its own literal (no copy-paste drift)', () => {
  for (const vocab of [LISTING_STATUS, OFFER_STATUS, MATCH_STATUS, COMPETITION_STATUS, PLAYER_STATUS]) {
    for (const [k, v] of Object.entries(vocab)) assert.equal(k, v);
  }
});
