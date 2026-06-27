import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildScoutingReport, type ScoutingPlayer } from './scouting.js';

function p(position: string, ovrCurrent = 70, age = 24): ScoutingPlayer {
  return { position, ovrCurrent, age };
}

test('flags a position group with zero players as critical', () => {
  const squad: ScoutingPlayer[] = [p('CB'), p('CM'), p('ST')]; // no GK
  const report = buildScoutingReport(squad);
  const gk = report.groups.find((g) => g.group === 'GK')!;
  assert.equal(gk.count, 0);
  assert.equal(gk.need, 'critical');
  assert.equal(report.topPriority?.group, 'GK');
});

test('a full, balanced squad reports no critical deficit', () => {
  const squad: ScoutingPlayer[] = [
    p('GK'), p('GK'),
    p('CB'), p('CB'), p('LB'), p('RB'), p('CB'), p('LWB'),
    p('CDM'), p('CM'), p('CM'), p('CAM'), p('LM'),
    p('ST'), p('ST'), p('LW'), p('RW'),
  ];
  const report = buildScoutingReport(squad);
  assert.equal(report.topPriority, null);
  assert.ok(report.groups.every((g) => g.need === 'ok'));
});

test('detects ageing groups even when depth is fine', () => {
  const squad: ScoutingPlayer[] = [
    p('GK', 80, 33), p('GK', 70, 31),
    p('CB', 82, 34), p('CB', 80, 33), p('LB', 78, 31), p('RB', 79, 32), p('CB', 77, 30), p('LWB', 76, 31),
    p('CDM', 80, 24), p('CM', 81, 25), p('CM', 79, 23), p('CAM', 80, 22), p('LM', 78, 24),
    p('ST', 84, 25), p('ST', 80, 24), p('LW', 82, 23), p('RW', 81, 24),
  ];
  const report = buildScoutingReport(squad);
  const def = report.groups.find((g) => g.group === 'DEF')!;
  assert.equal(def.need, 'aging');
  assert.ok(def.avgAge >= 30);
});

test('normalises position variants (CF→ATT, LCB→DEF) into groups', () => {
  const squad: ScoutingPlayer[] = [p('CF'), p('LCB'), p('RCB')];
  const report = buildScoutingReport(squad);
  assert.equal(report.groups.find((g) => g.group === 'ATT')!.count, 1);
  assert.equal(report.groups.find((g) => g.group === 'DEF')!.count, 2);
});
