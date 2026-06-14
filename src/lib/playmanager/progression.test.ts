import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  getCityActionXpReward,
  getCombinedClubEffects,
  getManagerLevelFromXp,
  getManagerProgression,
} from './progression.js';

test('manager level formula matches the profile XP curve', () => {
  assert.equal(getManagerLevelFromXp(0), 1);
  assert.equal(getManagerLevelFromXp(100), 2);
  assert.equal(getManagerLevelFromXp(400), 3);
  assert.equal(getManagerLevelFromXp(900), 4);
});

test('manager progression exposes progress and unlocked perks', () => {
  const progression = getManagerProgression(950);

  assert.equal(progression.level, 4);
  assert.ok(progression.progressPercent > 0);
  assert.ok(progression.perks.length > 0);
  assert.ok(progression.bonuses.trainingXpPct > 0);
});

test('combined club effects stack manager and facility bonuses', () => {
  const progression = getManagerProgression(950);
  const effects = getCombinedClubEffects(progression, [
    { spriteKey: 'arena', level: 3, progress: 80, status: 'active' },
    { spriteKey: 'training', level: 2, progress: 72, status: 'upgradeable' },
    { spriteKey: 'market', level: 2, progress: 55, status: 'attention' },
    { spriteKey: 'finance', level: 2, progress: 61, status: 'active' },
    { spriteKey: 'league', level: 2, progress: 88, status: 'completed' },
    { spriteKey: 'academy', level: 1, progress: 40, status: 'active' },
    { spriteKey: 'media', level: 1, progress: 24, status: 'locked' },
  ]);

  assert.ok(effects.bonuses.matchdayIncomePct > progression.bonuses.matchdayIncomePct);
  assert.ok(effects.bonuses.transferDiscountPct > progression.bonuses.transferDiscountPct);
  assert.ok(effects.bonuses.sponsorBonusPct > progression.bonuses.sponsorBonusPct);
  assert.equal(effects.spotlight.length, 4);
});

test('city action XP rewards stay defined for all current actions', () => {
  assert.equal(getCityActionXpReward('league_sim'), 30);
  assert.equal(getCityActionXpReward('training_session'), 22);
  assert.equal(getCityActionXpReward('facility_upgrade'), 12);
});
