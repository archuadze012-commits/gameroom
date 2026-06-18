import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  MARKET_TARGETS,
  getActionProgressGain,
  getActionRewardGel,
  getFacilityProgressAfterAction,
  getFacilityStatusAfterProgress,
  getFacilityUpgradeCostGel,
  isFacilityKey,
} from './gameplay.js';
import { getCurrentTransferValueGel, TOP_OVR_BASE_TRANSFER_VALUE_GEL } from './economy.js';

test('facility upgrade cost increases by level', () => {
  assert.ok(getFacilityUpgradeCostGel('arena', 2) > getFacilityUpgradeCostGel('arena', 1));
  assert.ok(getFacilityUpgradeCostGel('finance', 3) > getFacilityUpgradeCostGel('finance', 2));
});

test('facility progress is capped between 0 and 100', () => {
  assert.equal(getFacilityProgressAfterAction(96, 18), 100);
  assert.equal(getFacilityProgressAfterAction(-10, 4), 0);
});

test('facility progress maps to status', () => {
  assert.equal(getFacilityStatusAfterProgress(100), 'completed');
  assert.equal(getFacilityStatusAfterProgress(70), 'upgradeable');
  assert.equal(getFacilityStatusAfterProgress(69), 'active');
});

test('city actions expose progress and rewards', () => {
  assert.equal(getActionProgressGain('training_session'), 12);
  assert.equal(getActionRewardGel('arena_matchday', 2), 0);
  assert.equal(getActionRewardGel('league_sim', 2), 0);
  assert.equal(getActionRewardGel('finance_sponsor', 2), 280_000);
  assert.equal(getActionRewardGel('training_session', 2), 0);
});

test('facility key validation rejects unknown values', () => {
  assert.equal(isFacilityKey('arena'), true);
  assert.equal(isFacilityKey('hospital'), false);
});

test('market targets keep EA FC top player at 100 million GEL base value', () => {
  const topTarget = MARKET_TARGETS.find((target) => target.ovr === 91);
  assert.ok(topTarget);
  assert.equal(getCurrentTransferValueGel(topTarget.ovr, topTarget.ovr), TOP_OVR_BASE_TRANSFER_VALUE_GEL);
});
