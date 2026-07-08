// Type declarations for the city snapshot — both the output DTO
// (PlayManagerCitySnapshot and its City* pieces) and the raw DB *Row input
// shapes the snapshot builder reads. Extracted from city-data.ts to keep that
// file focused on the getPlayManagerCitySnapshot logic.
import type { PlayManagerPlayerCardLayout } from './player-card';
import type { PlayerCardStatsInput } from './player-card-stats';
import { getStaffBonuses, type StaffRoleKey } from './staff';

export type CitySquadPlayer = {
  squadId: number;
  id: string;
  name: string;
  cardDisplayName?: string | null;
  cardImageUrl?: string | null;
  nationalityCode?: string | null;
  cardEditorConfig?: PlayManagerPlayerCardLayout;
  stats?: PlayerCardStatsInput;
  position: string;
  age: number;
  ovrBase: number;
  ovrCurrent: number;
  value: number;
  valueLabel: string;
  fatigue: number;
  morale: number;
  injuryMatches: number;
  availability: 'ready' | 'injured';
  role: 'starter' | 'bench' | 'reserve';
  lineupSlot: number | null;
  talent: number;
  squadNumber: number | null;
};

export type CityMarketPlayer = {
  key: string;
  id: string | null;
  name: string;
  cardDisplayName?: string | null;
  cardImageUrl?: string | null;
  nationalityCode?: string | null;
  cardEditorConfig?: PlayManagerPlayerCardLayout;
  stats?: PlayerCardStatsInput;
  position: string;
  age: number;
  ovr: number;
  talent: number;
  value: number;
  valueLabel: string;
  demand: string;
  available: boolean;
  shortlisted: boolean;
  // Set only for manager-listed players (transfer_market module); drives the
  // buy flow to pm_buy_listed_player instead of the free-pool buy.
  listingId?: string | null;
  sellerTeamName?: string | null;
};

export type CityOutgoingListing = {
  listingId: string;
  playerId: string;
  name: string;
  position: string;
  ovr: number;
  askingPrice: number;
  askingPriceLabel: string;
};

export type CityTransaction = {
  amount: number;
  amountLabel: string;
  reason: string;
  createdAt: string;
};

export type CityMatchHistory = {
  round: number;
  opponent: string;
  venue: 'Home' | 'Away';
  score: string;
  result: 'W' | 'D' | 'L';
  attendance: number;
  attendanceLabel: string;
  income: number;
  incomeLabel: string;
  fanMood: number;
  createdAt: string;
};

export type CityAcademyProspect = {
  id: string;
  playerId: string | null;
  name: string;
  position: string;
  age: number;
  talent: number;
  ovr: number;
  potential: number;
  signingCost: number;
  signingCostLabel: string;
};

export type CityEventFeedItem = {
  id: number;
  category: 'match' | 'medical' | 'finance' | 'academy' | 'media' | 'board' | 'system';
  accent: 'green' | 'red' | 'gold';
  title: string;
  detail: string | null;
  weekNo: number;
  dayNo: number;
  createdAt: string;
};

export type CityFinanceSnapshot = {
  ticketPrice: number;
  sponsorTier: 'local' | 'regional' | 'global';
  sponsorWeeklyAmount: number;
  sponsorWeeklyAmountLabel: string;
  weeklyWages: number;
  weeklyWagesLabel: string;
  projectedAttendance: number;
  projectedAttendanceLabel: string;
  projectedMatchdayIncome: number;
  projectedMatchdayIncomeLabel: string;
  stadiumLevel: number;
  stadiumCapacity: number;
  stadiumCapacityLabel: string;
};

export type CityStaffMember = {
  roleKey: StaffRoleKey;
  name: string;
  shortName: string;
  category: 'coaching' | 'scouting' | 'medical' | 'operations';
  description: string;
  level: number;
  maxLevel: number;
  isHired: boolean;
  hireCost: number;
  hireCostLabel: string;
  upgradeCost: number | null;
  upgradeCostLabel: string | null;
  weeklyWage: number;
  weeklyWageLabel: string;
  benefitLabel: string;
};

export type PlayManagerCitySnapshot = {
  squad: CitySquadPlayer[];
  starters: CitySquadPlayer[];
  bench: CitySquadPlayer[];
  reserves: CitySquadPlayer[];
  formationLabel: string;
  academy: CityAcademyProspect[];
  market: CityMarketPlayer[];
  outgoingListings: CityOutgoingListing[];
  transactions: CityTransaction[];
  matchHistory: CityMatchHistory[];
  standings: Array<{
    team: string;
    pts: number;
    played: number;
    formPercent: number;
  }>;
  season: {
    seasonNo: number;
    isCompleted: boolean;
    lastFinish: number | null;
    lastReward: number;
    lastRewardLabel: string;
    lastOutcome: 'promoted' | 'relegated' | 'stayed' | null;
  };
  clock: {
    weekNo: number;
    dayNo: number;
    totalDays: number;
    label: string;
  };
  eventFeed: CityEventFeedItem[];
  finance: CityFinanceSnapshot;
  dailyReward: {
    canClaim: boolean;
    streak: number;
    nextStreak: number;
    nextReward: number;
    nextRewardLabel: string;
  };
  staff: {
    members: CityStaffMember[];
    maxLevelByDivision: number;
    totalWeeklyWages: number;
    totalWeeklyWagesLabel: string;
    bonuses: ReturnType<typeof getStaffBonuses>;
  };
  matchSettings: {
    tacticalStyle: 'balanced' | 'pressing' | 'possession' | 'counter';
    defensiveLine: 'low' | 'mid' | 'high';
    tempo: 'controlled' | 'balanced' | 'direct';
    focusSide: 'left' | 'center' | 'right';
    readiness: number;
    injuredCount: number;
    availableCount: number;
    avgMorale: number;
  };
  nextMatchLabel: string;
  formPercent: number;
  upcomingCupMatch: {
    id: string;
    cupId: string;
    templateId: string;
    cupName: string;
    round: number;
    position: number;
    status: 'pending' | 'ready' | 'completed';
    startTime: string;
    opponentTeamId: string;
    opponentName: string;
    isHome: boolean;
  } | null;
  cups: {
    id: string;
    templateId: string;
    name: string;
    prizePoolLabel: string;
    entryFeeLabel: string;
    maxTeams: number;
    participantCount: number;
    isRegistered: boolean;
    status: 'registration' | 'in_progress' | 'completed';
  }[];
  unassigned: CitySquadPlayer[];
};

export type PlayManagerCitySnapshotMode = 'full' | 'lineup' | 'light' | 'residence' | 'office';

export type BaseSquadPlayer = Omit<CitySquadPlayer, 'role'> & {
  normalizedName: string;
};

export type SquadRow = {
  id: number;
  shirt_number: number | null;
  squad_number: number | null;
  position: string;
  player: {
    id: string;
    normalized_name: string;
    display_name: string;
    card_display_name: string | null;
    primary_position: string | null;
    card_image_url: string | null;
    nationality_code: string | null;
    card_sil_width: number | null;
    card_sil_height: number | null;
    card_sil_x: number | null;
    card_sil_y: number | null;
    card_sil_opacity: number | null;
    card_content_y: number | null;
    card_name_size: number | null;
    card_stats_scale: number | null;
    card_stats: PlayerCardStatsInput;
    is_real: boolean;
    real_age: number | null;
    age: number;
    age_started_total_days: number | null;
    ovr_base: number;
    ovr_current: number;
    current_transfer_value_gel: number;
    fatigue: number;
    morale: number;
    injury_matches: number;
    status: 'active' | 'injured' | 'retired';
    talent: number;
  } | null;
};

export type MarketRow = {
  id: string;
  normalized_name: string;
  display_name: string;
  card_display_name: string | null;
  primary_position: string | null;
  card_image_url: string | null;
  nationality_code: string | null;
  card_sil_width: number | null;
  card_sil_height: number | null;
  card_sil_x: number | null;
  card_sil_y: number | null;
  card_sil_opacity: number | null;
  card_content_y: number | null;
  card_name_size: number | null;
  card_stats_scale: number | null;
  card_stats: PlayerCardStatsInput;
  is_real: boolean;
  talent: number;
  ea_fc_ovr: number | null;
  real_age: number | null;
  age: number;
  age_started_total_days: number | null;
  ovr_current: number;
  current_transfer_value_gel: number;
  owner_id: string | null;
};

export type TransactionRow = {
  amount: number;
  reason: string;
  created_at: string;
};

export type StandingRow = {
  club_name: string;
  played: number;
  points: number;
  form_percent: number;
  row_order: number;
};

export type MatchHistoryRow = {
  round_no: number;
  opponent_name: string;
  venue: 'Home' | 'Away';
  scored: number;
  conceded: number;
  result: 'W' | 'D' | 'L';
  attendance: number;
  income: number;
  fan_mood: number;
  created_at: string;
};

export type SeasonStateRow = {
  season_no: number;
  is_completed: boolean;
  last_finish: number | null;
  last_reward: number;
  last_outcome: 'promoted' | 'relegated' | 'stayed' | null;
};

export type AcademyProspectRow = {
  id: string;
  player_id: string | null;
  normalized_name: string;
  display_name: string;
  position: string;
  age: number;
  talent: number;
  ovr_base: number;
  potential_ovr: number;
  signing_cost: number;
};

export type MarketShortlistRow = {
  player_key: string;
};

export type MatchSettingsRow = {
  tactical_style: 'balanced' | 'pressing' | 'possession' | 'counter';
  defensive_line: 'low' | 'mid' | 'high';
  tempo: 'controlled' | 'balanced' | 'direct';
  focus_side: 'left' | 'center' | 'right';
};

export type CalendarRow = {
  week_no: number;
  day_no: number;
  total_days: number;
};

export type EventFeedRow = {
  id: number;
  category: CityEventFeedItem['category'];
  accent: CityEventFeedItem['accent'];
  title: string;
  detail: string | null;
  week_no: number;
  day_no: number;
  created_at: string;
};

export type FinanceStateRow = {
  ticket_price: number;
  sponsor_tier: 'local' | 'regional' | 'global';
  sponsor_weekly_amount: number;
};

export type ArenaFacilityRow = {
  level: number;
};

export type EngagementRow = {
  streak: number;
  last_claim_day: number;
};

export type CupTemplateRow = {
  id: string;
  name: string;
  prize_pool: number;
  entry_fee: number;
  max_teams: number;
};

export type CupParticipantRow = {
  team_id: string;
};

export type CupInstanceRow = {
  id: string;
  status: 'registration' | 'in_progress' | 'completed';
  pm_cup_templates: CupTemplateRow | CupTemplateRow[] | null;
  pm_cup_participants: CupParticipantRow[] | null;
};

export type CupMatchTeamRow = {
  id?: string;
  name: string;
};

export type CupMatchInstanceTemplateRow = {
  id: string;
  name: string;
};

export type CupMatchInstanceRow = {
  id?: string;
  template_id?: string;
  status: 'registration' | 'in_progress' | 'completed';
  pm_cup_templates: CupMatchInstanceTemplateRow | CupMatchInstanceTemplateRow[] | null;
};

export type CupMatchRow = {
  id: string;
  cup_instance_id: string;
  round: number;
  position: number;
  status: 'pending' | 'ready' | 'completed';
  start_time: string;
  team1_id: string;
  team2_id: string;
  team1: CupMatchTeamRow | CupMatchTeamRow[] | null;
  team2: CupMatchTeamRow | CupMatchTeamRow[] | null;
  pm_cup_instances: CupMatchInstanceRow | CupMatchInstanceRow[] | null;
};

export type UntypedSupabaseQuery = PromiseLike<{ data: unknown; error: unknown }> & {
  select: (columns: string) => UntypedSupabaseQuery;
  or: (filters: string) => UntypedSupabaseQuery;
  eq: (column: string, value: unknown) => UntypedSupabaseQuery;
  in: (column: string, values: readonly string[]) => UntypedSupabaseQuery;
  order: (column: string, options?: { ascending?: boolean }) => UntypedSupabaseQuery;
};

export type UntypedSupabaseClient = {
  from: (table: string) => UntypedSupabaseQuery;
};
