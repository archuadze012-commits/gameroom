import test from 'node:test';
import assert from 'node:assert/strict';
import { getEffectiveRealPlayerTalent, getTalentDecayFromAgeTransition } from './player-age';

test('talent decay triggers when player crosses 32 and 36', () => {
  assert.equal(getTalentDecayFromAgeTransition(31, 32), 1);
  assert.equal(getTalentDecayFromAgeTransition(35, 36), 1);
  assert.equal(getTalentDecayFromAgeTransition(31, 36), 2);
  assert.equal(getTalentDecayFromAgeTransition(33, 35), 0);
});

test('real player youth talent uses real age instead of reset display age', () => {
  assert.equal(getEffectiveRealPlayerTalent({
    isReal: true,
    storedAge: 18,
    realAge: 34,
    baseOvr: 91,
    talent: 10,
  }), 10);
  assert.equal(getEffectiveRealPlayerTalent({
    isReal: true,
    storedAge: 18,
    realAge: 18,
    baseOvr: 80,
    talent: 8,
  }), 11);
  assert.equal(getEffectiveRealPlayerTalent({
    isReal: true,
    storedAge: 18,
    realAge: null,
    baseOvr: 90,
    talent: 10,
  }), 10);
});
