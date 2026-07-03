// PlayManager scouting report — analyses the squad for positional deficits,
// quality gaps and ageing risk, and turns each into a transfer recommendation.
// Pure + framework-free so it can be unit-tested and reused by any UI.

import { getPositionGroup, type PositionFilterKey } from './secondary-positions';

export type ScoutingPlayer = {
  position: string;
  age: number;
  ovrCurrent: number;
  role?: 'starter' | 'bench' | 'reserve';
};

// Alias of the canonical position-group key — scouting keeps the historical name.
export type PositionGroupKey = PositionFilterKey;

export type ScoutingNeed = 'critical' | 'thin' | 'aging' | 'ok';

export type ScoutingGroupReport = {
  group: PositionGroupKey;
  label: string;
  count: number;
  recommendedDepth: number;
  bestOvr: number;
  avgOvr: number;
  avgAge: number;
  need: ScoutingNeed;
  priority: number; // 0 (none) … 100 (most urgent) — for sorting/severity bars
  message: string;
};

export type ScoutingReport = {
  groups: ScoutingGroupReport[];
  topPriority: ScoutingGroupReport | null;
  headline: string;
};

const GROUP_LABEL: Record<PositionGroupKey, string> = {
  GK: 'მეკარეები',
  DEF: 'დაცვა',
  MID: 'ნახევარმცველები',
  ATT: 'შეტევა',
};

// Minimum healthy depth for an 18+ man squad.
const RECOMMENDED_DEPTH: Record<PositionGroupKey, number> = {
  GK: 2,
  DEF: 6,
  MID: 5,
  ATT: 4,
};

const AGING_THRESHOLD = 30; // avg age at/above which succession planning matters

function groupOf(position: string): PositionGroupKey {
  return getPositionGroup(position);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function buildGroup(group: PositionGroupKey, players: ScoutingPlayer[]): ScoutingGroupReport {
  const recommendedDepth = RECOMMENDED_DEPTH[group];
  const count = players.length;
  const bestOvr = count ? Math.max(...players.map((p) => p.ovrCurrent)) : 0;
  const avgOvr = count ? round1(players.reduce((s, p) => s + p.ovrCurrent, 0) / count) : 0;
  const avgAge = count ? round1(players.reduce((s, p) => s + p.age, 0) / count) : 0;

  const shortfall = Math.max(0, recommendedDepth - count);
  const aging = count > 0 && avgAge >= AGING_THRESHOLD;

  let need: ScoutingNeed;
  let priority: number;
  let message: string;

  if (count === 0) {
    need = 'critical';
    priority = 100;
    message = `${GROUP_LABEL[group]}: საერთოდ არ გყავს — სასწრაფო ხელმოწერა.`;
  } else if (shortfall >= 2) {
    need = 'critical';
    priority = 80 + shortfall * 4;
    message = `${GROUP_LABEL[group]}: მხოლოდ ${count} მოთამაშე (საჭიროა ≥${recommendedDepth}). სიღრმე კრიტიკულად დაბალია.`;
  } else if (shortfall === 1) {
    need = 'thin';
    priority = 55;
    message = `${GROUP_LABEL[group]}: სიღრმე თხელია — კიდევ ერთი ${recommendedDepth}-დან აკლია, ტრავმა გაჭირვებას შექმნის.`;
  } else if (aging) {
    need = 'aging';
    priority = 40;
    message = `${GROUP_LABEL[group]}: საშუალო ასაკი ${avgAge} — დაგეგმე მემკვიდრე ახალგაზრდა ხელმოწერით.`;
  } else {
    need = 'ok';
    priority = 0;
    message = `${GROUP_LABEL[group]}: დაბალანსებულია (${count} მოთამაშე, საუკეთესო OVR ${bestOvr}).`;
  }

  return {
    group,
    label: GROUP_LABEL[group],
    count,
    recommendedDepth,
    bestOvr,
    avgOvr,
    avgAge,
    need,
    priority: Math.min(100, priority),
    message,
  };
}

export function buildScoutingReport(squad: ScoutingPlayer[]): ScoutingReport {
  const order: PositionGroupKey[] = ['GK', 'DEF', 'MID', 'ATT'];
  const buckets: Record<PositionGroupKey, ScoutingPlayer[]> = { GK: [], DEF: [], MID: [], ATT: [] };
  for (const player of squad) buckets[groupOf(player.position)].push(player);

  const groups = order.map((g) => buildGroup(g, buckets[g]));
  const ranked = [...groups].sort((a, b) => b.priority - a.priority);
  const topPriority = ranked[0] && ranked[0].priority > 0 ? ranked[0] : null;

  const headline = topPriority
    ? `მთავარი პრიორიტეტი: ${topPriority.label}.`
    : 'შემადგენლობა დაბალანსებულია — კრიტიკული დეფიციტი არ ფიქსირდება.';

  return { groups, topPriority, headline };
}
