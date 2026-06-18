import test from 'node:test';
import assert from 'node:assert/strict';
import { getMaxStaffLevelForDivision, getStaffBonuses, getStaffUpgradeCost } from './staff';

test('staff division cap follows division ladder', () => {
  assert.equal(getMaxStaffLevelForDivision(1), 5);
  assert.equal(getMaxStaffLevelForDivision(2), 4);
  assert.equal(getMaxStaffLevelForDivision(3), 3);
  assert.equal(getMaxStaffLevelForDivision(4), 2);
  assert.equal(getMaxStaffLevelForDivision(5), 1);
});

test('staff bonuses aggregate across hired members', () => {
  const bonuses = getStaffBonuses([
    { roleKey: 'head_coach', level: 2 },
    { roleKey: 'scout', level: 3 },
    { roleKey: 'physiotherapist', level: 2 },
    { roleKey: 'psychologist', level: 1 },
    { roleKey: 'finance_manager', level: 1 },
  ]);

  assert.equal(bonuses.readinessFlat, 4);
  assert.equal(bonuses.marketExtraPlayers, 3);
  assert.equal(bonuses.physioRecoveryPct, 14);
  assert.equal(bonuses.psychologistMoralePct, 6);
  assert.equal(bonuses.projectedIncomePct, 3);
  assert.ok(bonuses.totalWeeklyWages > 0);
});

test('staff upgrade cost increases with level', () => {
  assert.ok(getStaffUpgradeCost('head_coach', 2) > getStaffUpgradeCost('head_coach', 1));
});
