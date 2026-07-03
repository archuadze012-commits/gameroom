export type StaffRoleKey =
  | 'head_coach'
  | 'gk_coach'
  | 'defence_coach'
  | 'midfield_coach'
  | 'attack_coach'
  | 'scout'
  | 'youth_scout'
  | 'doctor'
  | 'physiotherapist'
  | 'psychologist'
  | 'finance_manager'
  | 'set_piece_coach';

export type StaffCategory = 'coaching' | 'scouting' | 'medical' | 'operations';

type StaffRoleDefinition = {
  key: StaffRoleKey;
  name: string;
  shortName: string;
  category: StaffCategory;
  description: string;
  baseHireCost: number;
  baseWeeklyWage: number;
};

export const STAFF_ROLES: StaffRoleDefinition[] = [
  {
    key: 'head_coach',
    name: 'მენეჯერის ასისტენტი',
    shortName: 'Manager Assistant',
    category: 'coaching',
    description: 'ზრდის გუნდის readiness-ს და მატებს საერთო მატჩის დისციპლინას.',
    baseHireCost: 140_000,
    baseWeeklyWage: 18_000,
  },
  {
    key: 'gk_coach',
    name: 'მეკარეების მწვრთნელი',
    shortName: 'GK Coach',
    category: 'coaching',
    description: 'ზრდის მეკარეების განვითარების ხარისხს და სეივების სტაბილურობას.',
    baseHireCost: 95_000,
    baseWeeklyWage: 12_000,
  },
  {
    key: 'defence_coach',
    name: 'დაცვის მწვრთნელი',
    shortName: 'Defence Coach',
    category: 'coaching',
    description: 'მცველებს აძლიერებს და დაცვით სტრუქტურას უფრო მყარად ხდის.',
    baseHireCost: 100_000,
    baseWeeklyWage: 12_500,
  },
  {
    key: 'midfield_coach',
    name: 'ნახევარდაცვის მწვრთნელი',
    shortName: 'Midfield',
    category: 'coaching',
    description: 'ნახევარმცველებს ავითარებს — პასი, კონტროლი და შუა ხაზის ბალანსი.',
    baseHireCost: 104_000,
    baseWeeklyWage: 12_800,
  },
  {
    key: 'attack_coach',
    name: 'შეტევის მწვრთნელი',
    shortName: 'Attack Coach',
    category: 'coaching',
    description: 'შეტევით ფეხბურთელებს აძლიერებს და დასრულების ხარისხს აუმჯობესებს.',
    baseHireCost: 108_000,
    baseWeeklyWage: 13_000,
  },
  {
    key: 'scout',
    name: 'სკაუტი',
    shortName: 'Scout',
    category: 'scouting',
    description: 'ტრანსფერების ბაზარზე მეტ ვარიანტს ხსნის და უკეთეს სამიზნეებს პოულობს.',
    baseHireCost: 88_000,
    baseWeeklyWage: 10_500,
  },
  {
    key: 'youth_scout',
    name: 'აკადემიის სკაუტი',
    shortName: 'Youth Scout',
    category: 'scouting',
    description: 'აკადემიაში უფრო მეტ და უკეთეს ტალანტს ამატებს.',
    baseHireCost: 92_000,
    baseWeeklyWage: 10_800,
  },
  {
    key: 'doctor',
    name: 'კლუბის ექიმი',
    shortName: 'Doctor',
    category: 'medical',
    description: 'მკურნალობს ტრავმირებულ მოთამაშეებს, აჩქარებს დაბრუნებას და ამცირებს სამედიცინო რისკს.',
    baseHireCost: 120_000,
    baseWeeklyWage: 14_500,
  },
  {
    key: 'physiotherapist',
    name: 'ფიზიოთერაპევტი',
    shortName: 'Physio',
    category: 'medical',
    description: 'ზრუნავს გადაღლილი მოთამაშეების სწრაფ აღდგენაზე და fatigue-ს უფრო სწრაფად ამცირებს.',
    baseHireCost: 98_000,
    baseWeeklyWage: 11_800,
  },
  {
    key: 'psychologist',
    name: 'ფსიქოლოგი',
    shortName: 'Psychologist',
    category: 'medical',
    description: 'ამაღლებს გუნდის მორალს და მძიმე შედეგების შემდეგ ფსიქოლოგიურ ვარდნას ამსუბუქებს.',
    baseHireCost: 90_000,
    baseWeeklyWage: 11_200,
  },
  {
    key: 'finance_manager',
    name: 'ფინანსური მენეჯერი',
    shortName: 'Finance',
    category: 'operations',
    description: 'ზრდის projected income-ს და ბიუჯეტის ეფექტიანობას.',
    baseHireCost: 110_000,
    baseWeeklyWage: 13_500,
  },
  {
    key: 'set_piece_coach',
    name: 'სტანდარტების მწვრთნელი',
    shortName: 'Set-piece',
    category: 'coaching',
    description: 'ზრდის გუნდის საჰაერო და სტანდარტული მდგომარეობების საფრთხეს — კუთხურები, საჯარიმოები და პენალტები.',
    baseHireCost: 96_000,
    baseWeeklyWage: 12_200,
  },
];

export const STAFF_ROLE_MAP: Record<StaffRoleKey, StaffRoleDefinition> = STAFF_ROLES.reduce(
  (acc, role) => {
    acc[role.key] = role;
    return acc;
  },
  {} as Record<StaffRoleKey, StaffRoleDefinition>,
);

type StaffBonuses = {
  readinessFlat: number;
  marketExtraPlayers: number;
  academyExtraProspects: number;
  projectedIncomePct: number;
  doctorRecoveryPct: number;
  physioRecoveryPct: number;
  psychologistMoralePct: number;
  setPiecePct: number;
  totalWeeklyWages: number;
};

export function getMaxStaffLevelForDivision(divisionId: number) {
  const safeDivision = Math.max(1, Math.min(5, Math.trunc(divisionId || 5)));
  return Math.max(1, Math.min(5, 6 - safeDivision));
}

export function getStaffHireCost(roleKey: StaffRoleKey) {
  return STAFF_ROLE_MAP[roleKey].baseHireCost;
}

export function getStaffUpgradeCost(roleKey: StaffRoleKey, currentLevel: number) {
  const safeLevel = Math.max(1, Math.trunc(currentLevel));
  return Math.round(STAFF_ROLE_MAP[roleKey].baseHireCost * Math.pow(1.72, safeLevel - 1));
}

export function getStaffWeeklyWage(roleKey: StaffRoleKey, level: number) {
  const safeLevel = Math.max(1, Math.trunc(level));
  return Math.round(STAFF_ROLE_MAP[roleKey].baseWeeklyWage * Math.pow(1.34, safeLevel - 1));
}

export function getStaffBenefitLabel(roleKey: StaffRoleKey, level: number) {
  const safeLevel = Math.max(1, Math.trunc(level));
  switch (roleKey) {
    case 'head_coach':
      return `Readiness +${safeLevel * 2}`;
    case 'gk_coach':
      return `GK training +${safeLevel * 6}%`;
    case 'defence_coach':
      return `Defence training +${safeLevel * 5}%`;
    case 'midfield_coach':
      return `Midfield training +${safeLevel * 5}%`;
    case 'attack_coach':
      return `Attack training +${safeLevel * 5}%`;
    case 'scout':
      return `Market shortlist +${safeLevel} players`;
    case 'youth_scout':
      return `Academy prospects +${safeLevel}`;
    case 'doctor':
      return `Injury treatment +${safeLevel * 8}%`;
    case 'physiotherapist':
      return `Fatigue recovery +${safeLevel * 7}%`;
    case 'psychologist':
      return `Morale support +${safeLevel * 6}%`;
    case 'finance_manager':
      return `Projected income +${safeLevel * 3}%`;
    case 'set_piece_coach':
      // Engine caps the set-piece boost at +60% (see buildMatchProfile /
      // pm_simulate_league_round); reflect that cap in the displayed benefit.
      return `Set-piece threat +${Math.min(60, safeLevel * 4)}%`;
  }
}

export function getStaffBonuses(
  staff: Array<{
    roleKey: StaffRoleKey;
    level: number;
  }>,
): StaffBonuses {
  return staff.reduce<StaffBonuses>(
    (acc, member) => {
      const level = Math.max(1, Math.trunc(member.level));
      acc.totalWeeklyWages += getStaffWeeklyWage(member.roleKey, level);

      switch (member.roleKey) {
        case 'head_coach':
          acc.readinessFlat += level * 2;
          break;
        // gk_coach / defence_coach / attack_coach affect OVR growth via the DB
        // training function (pm_train_player), not match-time bonuses — no TS
        // aggregate needed beyond their wages (added above).
        case 'scout':
          acc.marketExtraPlayers += level;
          break;
        case 'youth_scout':
          acc.academyExtraProspects += level;
          break;
        case 'doctor':
          acc.doctorRecoveryPct += level * 8;
          break;
        case 'physiotherapist':
          acc.physioRecoveryPct += level * 7;
          break;
        case 'psychologist':
          acc.psychologistMoralePct += level * 6;
          break;
        case 'finance_manager':
          acc.projectedIncomePct += level * 3;
          break;
        case 'set_piece_coach':
          acc.setPiecePct += level * 4;
          break;
      }
      return acc;
    },
    {
      readinessFlat: 0,
      marketExtraPlayers: 0,
      academyExtraProspects: 0,
      projectedIncomePct: 0,
      doctorRecoveryPct: 0,
      physioRecoveryPct: 0,
      psychologistMoralePct: 0,
      setPiecePct: 0,
      totalWeeklyWages: 0,
    },
  );
}
