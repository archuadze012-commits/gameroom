type PlayManagerMarketTier = 'A' | 'B' | 'C' | 'D';

type TalentBand = {
  min: number;
  max: number;
  weight: number;
};

type CopyLimitInput = {
  ovr: number;
  talent: number;
};

const DIVISION_TALENT_WEIGHTS: Record<PlayManagerMarketTier, TalentBand[]> = {
  A: [
    { min: 10, max: 11, weight: 15 },
    { min: 8, max: 9, weight: 55 },
    { min: 6, max: 7, weight: 30 },
    { min: 4, max: 5, weight: 8 },
    { min: 1, max: 3, weight: 2 },
  ],
  B: [
    { min: 10, max: 11, weight: 10 },
    { min: 6, max: 9, weight: 60 },
    { min: 4, max: 5, weight: 30 },
    { min: 1, max: 3, weight: 5 },
  ],
  C: [
    { min: 8, max: 11, weight: 5 },
    { min: 4, max: 7, weight: 70 },
    { min: 1, max: 3, weight: 25 },
  ],
  D: [
    { min: 6, max: 11, weight: 1 },
    { min: 4, max: 5, weight: 14 },
    { min: 1, max: 3, weight: 85 },
  ],
};

function normalizeTalent(talent: number) {
  return Math.max(1, Math.min(11, Math.trunc(talent || 1)));
}

export function getPlayManagerMarketTier(divisionId: number): PlayManagerMarketTier {
  const safeDivision = Math.max(1, Math.min(5, Math.trunc(divisionId || 5)));
  if (safeDivision <= 1) return 'A';
  if (safeDivision === 2) return 'B';
  if (safeDivision === 3) return 'C';
  return 'D';
}

export function getDivisionTalentWeight(divisionId: number, talent: number) {
  const tier = getPlayManagerMarketTier(divisionId);
  const normalizedTalent = normalizeTalent(talent);
  const band = DIVISION_TALENT_WEIGHTS[tier].find((entry) => normalizedTalent >= entry.min && normalizedTalent <= entry.max);
  return band?.weight ?? 1;
}

export function getDivisionTalentFocusLabel(divisionId: number) {
  const tier = getPlayManagerMarketTier(divisionId);
  switch (tier) {
    case 'A':
      return 'ფოკუსი: 8-11 Talent · იშვიათად 6-7';
    case 'B':
      return 'ფოკუსი: 6-9 Talent · იშვიათად 10+';
    case 'C':
      return 'ფოკუსი: 4-7 Talent · იშვიათად 8+';
    case 'D':
    default:
      return 'ფოკუსი: 1-3 Talent · იშვიათად 4+';
  }
}

export function getPlayerCopyLimit({ ovr, talent }: CopyLimitInput): number | null {
  const normalizedTalent = normalizeTalent(talent);

  if (ovr >= 85 || normalizedTalent >= 11) return 1;
  if (normalizedTalent === 10) return ovr >= 83 ? 1 : 2;
  if (normalizedTalent === 9) return 3;
  if (normalizedTalent === 8) return 5;
  if (ovr >= 82) return 3;
  if (ovr >= 78) return 6;
  return null;
}

export function pickWeightedUniqueItems<T>(
  items: T[],
  count: number,
  getWeight: (item: T) => number,
  rng: () => number = Math.random,
) {
  const pool = [...items];
  const picked: T[] = [];
  const targetCount = Math.max(0, Math.min(Math.trunc(count), pool.length));

  while (pool.length > 0 && picked.length < targetCount) {
    const weightedPool = pool.map((item) => ({
      item,
      weight: Math.max(0, getWeight(item)),
    }));
    const totalWeight = weightedPool.reduce((sum, entry) => sum + entry.weight, 0);

    if (totalWeight <= 0) {
      picked.push(...pool.slice(0, targetCount - picked.length));
      break;
    }

    let cursor = rng() * totalWeight;
    let selectedIndex = 0;
    for (let index = 0; index < weightedPool.length; index += 1) {
      cursor -= weightedPool[index]!.weight;
      if (cursor <= 0) {
        selectedIndex = index;
        break;
      }
    }

    picked.push(pool[selectedIndex]!);
    pool.splice(selectedIndex, 1);
  }

  return picked;
}
