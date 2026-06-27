import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDivisionTalentFocusLabel,
  getDivisionTalentWeight,
  getPlayManagerMarketTier,
  getPlayerCopyLimit,
  pickWeightedUniqueItems,
} from './market-policy';

test('division ladder maps to A through D market tiers', () => {
  assert.equal(getPlayManagerMarketTier(1), 'A');
  assert.equal(getPlayManagerMarketTier(2), 'B');
  assert.equal(getPlayManagerMarketTier(3), 'C');
  assert.equal(getPlayManagerMarketTier(4), 'D');
  assert.equal(getPlayManagerMarketTier(5), 'D');
});

test('lower divisions favor low-talent players while top divisions favor elite talent', () => {
  assert.ok(getDivisionTalentWeight(4, 2) > getDivisionTalentWeight(4, 11));
  assert.ok(getDivisionTalentWeight(1, 11) > getDivisionTalentWeight(1, 2));
  assert.match(getDivisionTalentFocusLabel(3), /4-7 Talent/);
});

test('copy caps stay strict for elite OVR and top talent', () => {
  assert.equal(getPlayerCopyLimit({ ovr: 85, talent: 8 }), 1);
  assert.equal(getPlayerCopyLimit({ ovr: 82, talent: 10 }), 2);
  assert.equal(getPlayerCopyLimit({ ovr: 81, talent: 9 }), 3);
  assert.equal(getPlayerCopyLimit({ ovr: 75, talent: 4 }), null);
});

test('weighted picker selects unique items and honors weights', () => {
  const items = [
    { key: 'low', weight: 1 },
    { key: 'mid', weight: 2 },
    { key: 'high', weight: 100 },
  ];
  const picked = pickWeightedUniqueItems(items, 2, (item) => item.weight, () => 0);

  assert.equal(picked.length, 2);
  assert.equal(new Set(picked.map((item) => item.key)).size, 2);
  assert.equal(picked[0]?.key, 'low');
});
