import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { generateVirtualPlayer, generateStarterSquad, ovrGrowthCap } from './players.js';

test('ovrGrowthCap returns correct caps', () => {
  assert.equal(ovrGrowthCap(10), 25);
  assert.equal(ovrGrowthCap(9),  20);
  assert.equal(ovrGrowthCap(8),  15);
  assert.equal(ovrGrowthCap(7),  15); // 7*2+1
  assert.equal(ovrGrowthCap(1),   3); // 1*2+1
});

test('generateVirtualPlayer produces valid player', async () => {
  const player = await generateVirtualPlayer(new Set(), 'CM');
  assert.ok(player.talent >= 1 && player.talent <= 10, 'talent in range');
  assert.ok(player.ovr_base >= 40 && player.ovr_base <= 75, 'ovr_base in range');
  assert.ok(player.age >= 18 && player.age <= 28, 'age in range');
  assert.equal(player.position, 'CM');
  assert.ok(player.normalized_name.length > 3);
});

test('generateStarterSquad returns 15 unique players', async () => {
  const squad = await generateStarterSquad(new Set());
  assert.equal(squad.length, 15);
  const names = new Set(squad.map(p => p.normalized_name));
  assert.equal(names.size, 15);
});

test('generateStarterSquad covers required positions', async () => {
  const squad = await generateStarterSquad(new Set());
  const positions = squad.map(p => p.position);
  assert.ok(positions.includes('GK'), 'has GK');
  assert.ok(positions.filter(p => p === 'CB').length >= 2, 'has 2+ CB');
  assert.ok(positions.includes('ST'), 'has ST');
});
