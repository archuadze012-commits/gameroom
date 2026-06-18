export type FacilityKey = 'arena' | 'market' | 'academy' | 'training' | 'finance' | 'league' | 'media' | 'medical' | 'residence';

export type FacilityStatus = 'active' | 'attention' | 'upgradeable' | 'locked' | 'completed';

export type CityActionKey =
  | 'arena_matchday'
  | 'market_scout'
  | 'academy_sign'
  | 'training_session'
  | 'finance_sponsor'
  | 'league_sim'
  | 'media_campaign'
  | 'facility_upgrade';

export type MarketTarget = {
  key: string;
  normalizedName: string;
  displayName: string;
  position: 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST' | 'CF' | 'LM' | 'RM' | 'AM';
  age: number;
  ovr: number;
  demand: string;
};

export type FacilityRule = {
  key: FacilityKey;
  baseUpgradeCostGel: number;
  matchdayRewardGel: number;
  defaultStatus: FacilityStatus;
  unlockLevel: number;
};

export const FACILITY_RULES: Record<FacilityKey, FacilityRule> = {
  arena: {
    key: 'arena',
    baseUpgradeCostGel: 620_000,
    matchdayRewardGel: 240_000,
    defaultStatus: 'active',
    unlockLevel: 1,
  },
  market: {
    key: 'market',
    baseUpgradeCostGel: 420_000,
    matchdayRewardGel: 0,
    defaultStatus: 'attention',
    unlockLevel: 1,
  },
  academy: {
    key: 'academy',
    baseUpgradeCostGel: 380_000,
    matchdayRewardGel: 0,
    defaultStatus: 'upgradeable',
    unlockLevel: 1,
  },
  training: {
    key: 'training',
    baseUpgradeCostGel: 510_000,
    matchdayRewardGel: 0,
    defaultStatus: 'active',
    unlockLevel: 1,
  },
  finance: {
    key: 'finance',
    baseUpgradeCostGel: 300_000,
    matchdayRewardGel: 0,
    defaultStatus: 'attention',
    unlockLevel: 1,
  },
  league: {
    key: 'league',
    baseUpgradeCostGel: 260_000,
    matchdayRewardGel: 90_000,
    defaultStatus: 'active',
    unlockLevel: 1,
  },
  media: {
    key: 'media',
    baseUpgradeCostGel: 220_000,
    matchdayRewardGel: 0,
    defaultStatus: 'locked',
    unlockLevel: 2,
  },
  medical: {
    key: 'medical',
    baseUpgradeCostGel: 350_000,
    matchdayRewardGel: 0,
    defaultStatus: 'active',
    unlockLevel: 1,
  },
  residence: {
    key: 'residence',
    baseUpgradeCostGel: 400_000,
    matchdayRewardGel: 0,
    defaultStatus: 'active',
    unlockLevel: 1,
  },
};

export const MARKET_TARGETS: MarketTarget[] = [
  {
    key: 'mbappe',
    normalizedName: 'kylian_mbappe',
    displayName: 'Kylian Mbappe',
    position: 'ST',
    age: 27,
    ovr: 91,
    demand: 'ძალიან მაღალი',
  },
  {
    key: 'bellingham',
    normalizedName: 'jude_bellingham',
    displayName: 'Jude Bellingham',
    position: 'CM',
    age: 22,
    ovr: 90,
    demand: 'მაღალი',
  },
  {
    key: 'kvaratskhelia',
    normalizedName: 'khvicha_kvaratskhelia',
    displayName: 'Khvicha Kvaratskhelia',
    position: 'LW',
    age: 25,
    ovr: 86,
    demand: 'სტაბილური',
  },
  {
    key: 'mamardashvili',
    normalizedName: 'giorgi_mamardashvili',
    displayName: 'Giorgi Mamardashvili',
    position: 'GK',
    age: 25,
    ovr: 85,
    demand: 'მზარდი',
  },
];

const RESIDENCE_SQUAD_LIMITS: Record<number, number> = { 1: 16, 2: 18, 3: 21, 4: 24, 5: 28 };
export function getSquadLimit(residenceLevel: number): number {
  return RESIDENCE_SQUAD_LIMITS[Math.min(Math.max(residenceLevel, 1), 5)] ?? 16;
}

export function getFacilityUpgradeCostGel(key: FacilityKey, level: number): number {
  const rule = FACILITY_RULES[key];
  const safeLevel = Math.max(1, Math.trunc(level));
  return Math.round(rule.baseUpgradeCostGel * Math.pow(1.42, safeLevel - 1));
}

export function getFacilityProgressAfterAction(progress: number, gain: number): number {
  return Math.min(100, Math.max(0, Math.trunc(progress) + Math.trunc(gain)));
}

export function getFacilityStatusAfterProgress(progress: number): FacilityStatus {
  return progress >= 100 ? 'completed' : progress >= 70 ? 'upgradeable' : 'active';
}

export function getActionProgressGain(action: CityActionKey): number {
  switch (action) {
    case 'arena_matchday':
      return 18;
    case 'market_scout':
      return 14;
    case 'academy_sign':
      return 16;
    case 'training_session':
      return 12;
    case 'finance_sponsor':
      return 20;
    case 'league_sim':
      return 15;
    case 'media_campaign':
      return 22;
    case 'facility_upgrade':
      return 0;
  }
}

export function getActionRewardGel(action: CityActionKey, level: number): number {
  const safeLevel = Math.max(1, Math.trunc(level));
  switch (action) {
    case 'arena_matchday':
      return 0;
    case 'finance_sponsor':
      return 120_000 + safeLevel * 80_000;
    case 'league_sim':
      return 0;
    case 'media_campaign':
      return 35_000 + safeLevel * 15_000;
    default:
      return 0;
  }
}

export function isFacilityKey(value: string): value is FacilityKey {
  return value in FACILITY_RULES;
}
