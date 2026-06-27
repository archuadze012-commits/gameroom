import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildFitnessReport, type FitnessPlayer } from './fitness.js';

function p(over: Partial<FitnessPlayer>): FitnessPlayer {
  return {
    name: 'X',
    position: 'CM',
    fatigue: 10,
    morale: 80,
    injuryMatches: 0,
    availability: 'ready',
    ...over,
  };
}

test('flags injured as out and tired as high risk, sorted worst-first', () => {
  const report = buildFitnessReport([
    p({ name: 'Fresh', fatigue: 10 }),
    p({ name: 'Tired', fatigue: 75 }),
    p({ name: 'Hurt', availability: 'injured', injuryMatches: 2 }),
  ]);
  assert.equal(report.rows[0].name, 'Hurt');
  assert.equal(report.rows[0].risk, 'out');
  assert.equal(report.rows[1].name, 'Tired');
  assert.equal(report.rows[1].risk, 'high');
  assert.equal(report.injuredCount, 1);
  assert.equal(report.highRiskCount, 1);
});

test('excludes injured from avg fatigue', () => {
  const report = buildFitnessReport([
    p({ fatigue: 20 }),
    p({ fatigue: 30 }),
    p({ availability: 'injured', injuryMatches: 1, fatigue: 90 }),
  ]);
  assert.equal(report.highRiskCount, 0);
  assert.equal(report.avgFatigue, 25); // (20+30)/2, injured excluded
});

test('a fully fit squad reports no rotation needed', () => {
  const report = buildFitnessReport([p({ fatigue: 20 }), p({ fatigue: 30 })]);
  assert.equal(report.injuredCount, 0);
  assert.match(report.headline, /სუფთაა/);
});
