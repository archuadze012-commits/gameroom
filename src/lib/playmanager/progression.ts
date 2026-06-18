import type { CityActionKey, FacilityKey } from './gameplay';
import type { TeamFacilityState } from './facilities';

export type ManagerPerk = {
  key: string;
  label: string;
  description: string;
};

export type ManagerProgression = {
  xp: number;
  level: number;
  title: string;
  levelStartXp: number;
  nextLevelXp: number;
  progressPercent: number;
  xpIntoLevel: number;
  xpToNextLevel: number;
  perks: ManagerPerk[];
  bonuses: ClubBonusMap;
};

export type ClubBonusMap = {
  transferDiscountPct: number;
  trainingXpPct: number;
  matchdayIncomePct: number;
  sponsorBonusPct: number;
  seasonRewardPct: number;
  academyQualityPct: number;
  fanMoodPct: number;
};

export type ClubEffectCard = {
  key: FacilityKey | 'manager';
  label: string;
  value: string;
  description: string;
};

export type ClubEffectsSummary = {
  bonuses: ClubBonusMap;
  spotlight: ClubEffectCard[];
};

const MANAGER_TITLES = [
  'Touchline Starter',
  'Locker Room Lead',
  'Tactical Voice',
  'Division Hunter',
  'City Architect',
  'Elite Manager',
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getManagerLevelFromXp(xp: number) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);
}

function getLevelStartXp(level: number) {
  return Math.max(0, Math.pow(Math.max(1, level) - 1, 2) * 100);
}

function getTitleForLevel(level: number) {
  if (level >= 10) return MANAGER_TITLES[5];
  if (level >= 8) return MANAGER_TITLES[4];
  if (level >= 6) return MANAGER_TITLES[3];
  if (level >= 4) return MANAGER_TITLES[2];
  if (level >= 2) return MANAGER_TITLES[1];
  return MANAGER_TITLES[0];
}

function buildManagerPerks(level: number, bonuses: ClubBonusMap): ManagerPerk[] {
  const perks: ManagerPerk[] = [];

  if (bonuses.trainingXpPct > 0) {
    perks.push({
      key: 'training-lab',
      label: 'Training Lab',
      description: `ვარჯიშის პროგრესი და XP +${bonuses.trainingXpPct}%`,
    });
  }
  if (bonuses.transferDiscountPct > 0) {
    perks.push({
      key: 'negotiator',
      label: 'Negotiator',
      description: `ტრანსფერებსა და აკადემიის ხელმოწერაზე -${bonuses.transferDiscountPct}%`,
    });
  }
  if (bonuses.matchdayIncomePct > 0 || bonuses.sponsorBonusPct > 0) {
    perks.push({
      key: 'commercial-edge',
      label: 'Commercial Edge',
      description: `Matchday +${bonuses.matchdayIncomePct}% · Sponsor +${bonuses.sponsorBonusPct}%`,
    });
  }
  if (bonuses.seasonRewardPct > 0 || bonuses.academyQualityPct > 0) {
    perks.push({
      key: 'long-game',
      label: 'Long Game',
      description: `Season reward +${bonuses.seasonRewardPct}% · Academy quality +${bonuses.academyQualityPct}%`,
    });
  }

  return perks.slice(0, 4);
}

export function getManagerProgression(xp: number): ManagerProgression {
  const safeXp = Math.max(0, Math.trunc(xp));
  const level = getManagerLevelFromXp(safeXp);
  const levelStartXp = getLevelStartXp(level);
  const nextLevelXp = getLevelStartXp(level + 1);
  const xpIntoLevel = safeXp - levelStartXp;
  const xpToNextLevel = Math.max(1, nextLevelXp - levelStartXp);
  const progressPercent = clamp(Math.round((xpIntoLevel / xpToNextLevel) * 100), 0, 100);

  const bonuses: ClubBonusMap = {
    transferDiscountPct: clamp((level - 1) * 2, 0, 18),
    trainingXpPct: clamp((level - 1) * 4, 0, 28),
    matchdayIncomePct: clamp(Math.max(0, level - 2) * 3, 0, 18),
    sponsorBonusPct: clamp(Math.max(0, level - 1) * 3, 0, 18),
    seasonRewardPct: clamp(Math.max(0, level - 3) * 3, 0, 18),
    academyQualityPct: clamp(Math.max(0, level - 1) * 2, 0, 12),
    fanMoodPct: clamp(Math.max(0, level - 2) * 2, 0, 12),
  };

  return {
    xp: safeXp,
    level,
    title: getTitleForLevel(level),
    levelStartXp,
    nextLevelXp,
    progressPercent,
    xpIntoLevel,
    xpToNextLevel: Math.max(0, nextLevelXp - safeXp),
    perks: buildManagerPerks(level, bonuses),
    bonuses,
  };
}

export function getFacilityEffectsSummary(facilities: TeamFacilityState[]): ClubEffectsSummary {
  const facilityMap = new Map(facilities.map((facility) => [facility.spriteKey, facility]));
  const bonuses: ClubBonusMap = {
    transferDiscountPct: Math.max(0, ((facilityMap.get('market')?.level ?? 1) - 1) * 2),
    trainingXpPct: Math.max(0, ((facilityMap.get('training')?.level ?? 1) - 1) * 5),
    matchdayIncomePct: Math.max(0, ((facilityMap.get('arena')?.level ?? 1) - 1) * 7),
    sponsorBonusPct: Math.max(0, ((facilityMap.get('finance')?.level ?? 1) - 1) * 6),
    seasonRewardPct: Math.max(0, ((facilityMap.get('league')?.level ?? 1) - 1) * 6),
    academyQualityPct: Math.max(0, ((facilityMap.get('academy')?.level ?? 1) - 1) * 4),
    fanMoodPct: Math.max(0, ((facilityMap.get('media')?.level ?? 1) - 1) * 6),
  };

  const spotlight: ClubEffectCard[] = [
    {
      key: 'arena',
      label: 'Arena',
      value: `+${bonuses.matchdayIncomePct}%`,
      description: 'matchday შემოსავალი',
    },
    {
      key: 'training',
      label: 'Training',
      value: `+${bonuses.trainingXpPct}%`,
      description: 'player growth / XP',
    },
    {
      key: 'finance',
      label: 'Finance',
      value: `+${bonuses.sponsorBonusPct}%`,
      description: 'sponsor reward',
    },
    {
      key: 'academy',
      label: 'Academy',
      value: `+${bonuses.academyQualityPct}%`,
      description: 'prospect quality',
    },
  ];

  return { bonuses, spotlight };
}

export function mergeClubBonuses(...sources: ClubBonusMap[]): ClubBonusMap {
  return sources.reduce<ClubBonusMap>(
    (acc, source) => ({
      transferDiscountPct: acc.transferDiscountPct + source.transferDiscountPct,
      trainingXpPct: acc.trainingXpPct + source.trainingXpPct,
      matchdayIncomePct: acc.matchdayIncomePct + source.matchdayIncomePct,
      sponsorBonusPct: acc.sponsorBonusPct + source.sponsorBonusPct,
      seasonRewardPct: acc.seasonRewardPct + source.seasonRewardPct,
      academyQualityPct: acc.academyQualityPct + source.academyQualityPct,
      fanMoodPct: acc.fanMoodPct + source.fanMoodPct,
    }),
    {
      transferDiscountPct: 0,
      trainingXpPct: 0,
      matchdayIncomePct: 0,
      sponsorBonusPct: 0,
      seasonRewardPct: 0,
      academyQualityPct: 0,
      fanMoodPct: 0,
    },
  );
}

export function getCombinedClubEffects(
  manager: ManagerProgression,
  facilities: TeamFacilityState[],
): ClubEffectsSummary {
  const facilityEffects = getFacilityEffectsSummary(facilities);
  const bonuses = mergeClubBonuses(manager.bonuses, facilityEffects.bonuses);

  return {
    bonuses,
    spotlight: [
      {
        key: 'manager',
        label: `Lvl ${manager.level}`,
        value: manager.title,
        description: `${manager.xp} XP`,
      },
      {
        key: 'arena',
        label: 'Matchday',
        value: `+${bonuses.matchdayIncomePct}%`,
        description: 'income boost',
      },
      {
        key: 'market',
        label: 'Transfer',
        value: `-${bonuses.transferDiscountPct}%`,
        description: 'buy/sign discount',
      },
      {
        key: 'league',
        label: 'Season',
        value: `+${bonuses.seasonRewardPct}%`,
        description: 'reward bonus',
      },
    ],
  };
}

export function getCityActionXpReward(action: CityActionKey) {
  switch (action) {
    case 'arena_matchday':
      return 24;
    case 'market_scout':
      return 16;
    case 'academy_sign':
      return 18;
    case 'training_session':
      return 22;
    case 'finance_sponsor':
      return 18;
    case 'league_sim':
      return 30;
    case 'media_campaign':
      return 14;
    case 'facility_upgrade':
      return 12;
  }
}

export function getActionRewardBonusPct(action: CityActionKey, bonuses: ClubBonusMap) {
  switch (action) {
    case 'arena_matchday':
      return bonuses.matchdayIncomePct;
    case 'finance_sponsor':
    case 'media_campaign':
      return bonuses.sponsorBonusPct;
    case 'league_sim':
      return bonuses.seasonRewardPct;
    default:
      return 0;
  }
}
