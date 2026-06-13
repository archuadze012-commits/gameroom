import { generateUniqueName } from './names.js';
import type { GeneratedPlayer, Position } from './types.js';

export function ovrGrowthCap(talent: number): number {
  if (talent === 10) return 25;
  if (talent === 9)  return 20;
  if (talent === 8)  return 15;
  return talent * 2 + 1; // T7=15, T6=13, T1=3
}

const TALENT_WEIGHTS: [number, number][] = [
  [1, 5], [2, 10], [3, 15], [4, 20], [5, 20],
  [6, 15], [7, 10], [8, 3], [9, 1], [10, 1],
];

function rollTalent(): number {
  const total = TALENT_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [t, w] of TALENT_WEIGHTS) {
    r -= w;
    if (r <= 0) return t;
  }
  return 5;
}

function rollOvrBase(talent: number): number {
  const floor = 40 + talent * 2;
  return Math.min(floor + Math.floor(Math.random() * 10), 75);
}

function rollAge(): number {
  return 18 + Math.floor(Math.random() * 11); // 18–28
}

export async function generateVirtualPlayer(
  excluded: Set<string>,
  position: Position,
): Promise<GeneratedPlayer> {
  const { display, normalized } = await generateUniqueName(excluded, 'virtual');
  const talent   = rollTalent();
  const ovr_base = rollOvrBase(talent);
  return {
    normalized_name: normalized,
    display_name: display,
    talent,
    ovr_base,
    age: rollAge(),
    position,
  };
}

// 4-3-3 base: 11 starters + 4 subs = 15 total
const STARTER_POSITIONS: Position[] = [
  'GK',
  'CB', 'CB', 'LB', 'RB',
  'CDM', 'CM', 'CM',
  'LW', 'RW', 'ST',
];
const SUB_POSITIONS: Position[] = ['GK', 'CB', 'CM', 'ST'];

export async function generateStarterSquad(
  excludedNames: Set<string>,
): Promise<GeneratedPlayer[]> {
  const players: GeneratedPlayer[] = [];
  const localExcluded = new Set(excludedNames);
  for (const pos of [...STARTER_POSITIONS, ...SUB_POSITIONS]) {
    const player = await generateVirtualPlayer(localExcluded, pos);
    localExcluded.add(player.normalized_name);
    players.push(player);
  }
  return players;
}
