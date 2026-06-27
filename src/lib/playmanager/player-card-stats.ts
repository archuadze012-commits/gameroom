export const GK_LABELS = ['DIV', 'HAN', 'KIC', 'REF', 'SPD', 'POS'] as const;
export const OUT_LABELS = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'] as const;

type GoalkeeperStatKey = (typeof GK_LABELS)[number];
type OutfieldStatKey = (typeof OUT_LABELS)[number];
export type PlayerStatKey = GoalkeeperStatKey | OutfieldStatKey;
export type PlayerCardStatsInput = Partial<Record<PlayerStatKey, number>> | null | undefined;
const ALL_STAT_LABELS = [...GK_LABELS, ...OUT_LABELS] as const;

const DEFAULT_OUTFIELD_OFFSETS: Record<string, readonly number[]> = {
  CB: [-12, -10, -2, -6, 16, 14],
  RB: [8, -8, 4, 8, 4, -16],
  LB: [8, -8, 4, 8, 4, -16],
  CDM: [0, -6, 8, 0, 10, -12],
  CM: [4, 2, 8, 4, -4, -14],
  CAM: [6, 10, 10, 12, -16, -22],
  LW: [14, 6, 0, 16, -18, -18],
  RW: [14, 6, 0, 16, -18, -18],
  ST: [10, 16, -8, 8, -20, -6],
  CF: [8, 12, 4, 10, -16, -18],
  LM: [10, 0, 6, 10, -10, -16],
  RM: [10, 0, 6, 10, -10, -16],
  AM: [6, 10, 10, 12, -16, -22],
};

const DEFAULT_GK_OFFSETS: readonly number[] = [4, 8, 2, 10, -14, -10];

function clampStat(value: number) {
  return Math.max(35, Math.min(99, Math.round(value)));
}

function getLabels(position: string) {
  return position === 'GK' ? GK_LABELS : OUT_LABELS;
}

function getOffsets(position: string) {
  if (position === 'GK') return DEFAULT_GK_OFFSETS;
  return DEFAULT_OUTFIELD_OFFSETS[position] ?? [0, 0, 0, 0, 0, 0];
}

export function parsePlayerCardStats(value: unknown): PlayerCardStatsInput {
  if (!value) return null;

  if (typeof value === 'string') {
    try {
      return parsePlayerCardStats(JSON.parse(value));
    } catch {
      return null;
    }
  }

  if (typeof value !== 'object' || Array.isArray(value)) return null;

  const source = value as Record<string, unknown>;
  const parsedEntries = ALL_STAT_LABELS.flatMap((label) => {
    const rawValue = source[label];
    const numericValue = typeof rawValue === 'number'
      ? rawValue
      : typeof rawValue === 'string' && rawValue.trim().length > 0
        ? Number(rawValue)
        : NaN;

    if (!Number.isFinite(numericValue)) return [];
    return [[label, clampStat(numericValue)] as const];
  });

  if (parsedEntries.length === 0) return null;
  return Object.fromEntries(parsedEntries) as Partial<Record<PlayerStatKey, number>>;
}

function rebalanceToTarget(values: number[], targetOverall: number) {
  const targetSum = targetOverall * values.length;
  let currentSum = values.reduce((sum, value) => sum + value, 0);

  while (currentSum !== targetSum) {
    const direction = currentSum < targetSum ? 1 : -1;
    let moved = false;

    for (let index = 0; index < values.length; index += 1) {
      const next = values[index]! + direction;
      if (next < 35 || next > 99) continue;
      values[index] = next;
      currentSum += direction;
      moved = true;
      if (currentSum === targetSum) break;
    }

    if (!moved) break;
  }

  return values;
}

export function createInitialPlayerStats(position: string, ovr: number) {
  const normalizedPosition = position.toUpperCase();
  const labels = getLabels(normalizedPosition);
  const offsets = getOffsets(normalizedPosition);
  const targetOverall = clampStat(ovr);
  const values = labels.map((_, index) => clampStat(targetOverall + offsets[index]!));
  const balancedValues = rebalanceToTarget(values, targetOverall);

  return Object.fromEntries(
    labels.map((label, index) => [label, balancedValues[index]!]),
  ) as Record<PlayerStatKey, number>;
}

export function normalizePlayerStats(position: string, stats: PlayerCardStatsInput, fallbackOverall: number) {
  const normalizedPosition = position.toUpperCase();
  const labels = getLabels(normalizedPosition);
  const seeded = createInitialPlayerStats(normalizedPosition, fallbackOverall);
  const parsedStats = parsePlayerCardStats(stats);

  return Object.fromEntries(
    labels.map((label) => [label, clampStat(Number(parsedStats?.[label] ?? seeded[label]))]),
  ) as Record<PlayerStatKey, number>;
}

export function derivePlayerStats(position: string, ovr: number, stats?: PlayerCardStatsInput) {
  const normalizedPosition = position.toUpperCase();
  const normalized = normalizePlayerStats(normalizedPosition, stats, ovr);
  const labels = getLabels(normalizedPosition);

  return labels.map((label) => ({
    label,
    value: normalized[label],
  }));
}
