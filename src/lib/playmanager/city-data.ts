import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatGel, getCurrentTransferValueGel, getProjectedAttendance, getProjectedMatchdayIncome, getProjectedWeeklyWages, getStadiumCapacity, getTalentClassAdjustedTransferValueGel } from './economy';
import { asPlayManagerDb } from './db';
import { getEafc26PlayerFaceUrl, resolveRealPlayerStats } from './eafc26-dataset';
import { MARKET_TARGETS } from './gameplay';
import { getPlayManagerNextOpponent } from './ai-opponents';
import { buildPlayManagerPlayerCardLayout, type PlayManagerPlayerCardLayout } from './player-card';
import { getEffectiveRealPlayerTalent, getPlayManagerDisplayAge } from './player-age';
import type { PlayerCardStatsInput } from './player-card-stats';
import {
  STAFF_ROLES,
  getMaxStaffLevelForDivision,
  getStaffBenefitLabel,
  getStaffBonuses,
  getStaffHireCost,
  getStaffUpgradeCost,
  getStaffWeeklyWage,
  type StaffRoleKey,
} from './staff';

type CitySquadPlayer = {
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

type CityMarketPlayer = {
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

type CityOutgoingListing = {
  listingId: string;
  playerId: string;
  name: string;
  position: string;
  ovr: number;
  askingPrice: number;
  askingPriceLabel: string;
};

function normalizeMarketPosition(position: string | null | undefined) {
  const normalized = position?.trim().toUpperCase();
  if (normalized === 'CF') return 'ST';
  return normalized || 'CM';
}

type CityTransaction = {
  amount: number;
  amountLabel: string;
  reason: string;
  createdAt: string;
};

type CityMatchHistory = {
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

type CityAcademyProspect = {
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

type CityEventFeedItem = {
  id: number;
  category: 'match' | 'medical' | 'finance' | 'academy' | 'media' | 'board' | 'system';
  accent: 'green' | 'red' | 'gold';
  title: string;
  detail: string | null;
  weekNo: number;
  dayNo: number;
  createdAt: string;
};

type CityFinanceSnapshot = {
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

type CityStaffMember = {
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
};

type PlayManagerCitySnapshotMode = 'full' | 'lineup' | 'light' | 'residence';

type BaseSquadPlayer = Omit<CitySquadPlayer, 'role'> & {
  normalizedName: string;
};

type SquadRow = {
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

type TeamMetaRow = {
  division_id: number;
};

type StaffRow = {
  role_key: StaffRoleKey;
  level: number;
};

const FORMATION_433_TARGETS = ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'LW', 'ST', 'RW'] as const;

function normalizePosition(position: string) {
  const p = position.toUpperCase();
  if (p === 'LCB' || p === 'RCB') return 'CB';
  if (p === 'LCM' || p === 'RCM') return 'CM';
  if (p === 'LWB') return 'LB';
  if (p === 'RWB') return 'RB';
  return p;
}

function canFillRole(playerPosition: string, targetPosition: string) {
  const position = normalizePosition(playerPosition);
  if (position === targetPosition) return true;
  if (targetPosition === 'CB') return position === 'CB';
  if (targetPosition === 'LB') return position === 'LB' || position === 'CB';
  if (targetPosition === 'RB') return position === 'RB' || position === 'CB';
  if (targetPosition === 'CDM') return position === 'CDM' || position === 'CM';
  if (targetPosition === 'CM') return position === 'CM' || position === 'CAM' || position === 'CDM';
  if (targetPosition === 'LW') return position === 'LW' || position === 'RW' || position === 'CAM';
  if (targetPosition === 'RW') return position === 'RW' || position === 'LW' || position === 'CAM';
  if (targetPosition === 'ST') return position === 'ST' || position === 'CAM' || position === 'LW' || position === 'RW';
  return false;
}

function pickBestLineup(baseSquad: BaseSquadPlayer[]) {
  const available = [...baseSquad];
  const starters: CitySquadPlayer[] = [];

  FORMATION_433_TARGETS.forEach((targetPosition, index) => {
    const candidateIndex = available.findIndex((player) => canFillRole(player.position, targetPosition));
    const bestIndex = available.reduce((selectedIndex, player, playerIndex) => {
      if (!canFillRole(player.position, targetPosition)) return selectedIndex;
      if (selectedIndex === -1) return playerIndex;
      const selected = available[selectedIndex];
      if (player.ovrCurrent !== selected.ovrCurrent) {
        return player.ovrCurrent > selected.ovrCurrent ? playerIndex : selectedIndex;
      }
      return player.fatigue < selected.fatigue ? playerIndex : selectedIndex;
    }, candidateIndex);

    if (bestIndex === -1) return;
    const [selected] = available.splice(bestIndex, 1);
    starters.push({
      ...selected,
      role: 'starter',
      lineupSlot: index + 1,
    });
  });

  const sortedRemaining = available.sort((left, right) => {
    if (right.ovrCurrent !== left.ovrCurrent) return right.ovrCurrent - left.ovrCurrent;
    return left.fatigue - right.fatigue;
  });

  const bench = sortedRemaining.slice(0, 4).map((player, index) => ({
    ...player,
    role: 'bench' as const,
    lineupSlot: 12 + index,
  }));

  const reserves = sortedRemaining.slice(4).map((player) => ({
    ...player,
    role: 'reserve' as const,
    lineupSlot: null,
  }));

  return {
    starters,
    bench,
    reserves,
    squad: [...starters, ...bench, ...reserves],
  };
}

function pickPersistedLineup(baseSquad: BaseSquadPlayer[]) {
  const sorted = [...baseSquad].sort((left, right) => (left.lineupSlot ?? 999) - (right.lineupSlot ?? 999));
  const starters = sorted
    .filter((player) => player.lineupSlot !== null && player.lineupSlot <= 11)
    .map((player) => ({ ...player, role: 'starter' as const }));
  const bench = sorted
    .filter((player) => player.lineupSlot !== null && player.lineupSlot >= 12 && player.lineupSlot <= 15)
    .map((player) => ({ ...player, role: 'bench' as const }));
  const reserves = sorted
    .filter((player) => player.lineupSlot === null || player.lineupSlot > 15)
    .map((player) => ({ ...player, role: 'reserve' as const, lineupSlot: player.lineupSlot && player.lineupSlot <= 15 ? null : player.lineupSlot }));

  return {
    starters,
    bench,
    reserves,
    squad: [...starters, ...bench, ...reserves],
  };
}

type MarketRow = {
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

type TransactionRow = {
  amount: number;
  reason: string;
  created_at: string;
};

type StandingRow = {
  club_name: string;
  played: number;
  points: number;
  form_percent: number;
  row_order: number;
};

type MatchHistoryRow = {
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

type SeasonStateRow = {
  season_no: number;
  is_completed: boolean;
  last_finish: number | null;
  last_reward: number;
  last_outcome: 'promoted' | 'relegated' | 'stayed' | null;
};

type AcademyProspectRow = {
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

type MarketShortlistRow = {
  player_key: string;
};

type MatchSettingsRow = {
  tactical_style: 'balanced' | 'pressing' | 'possession' | 'counter';
  defensive_line: 'low' | 'mid' | 'high';
  tempo: 'controlled' | 'balanced' | 'direct';
  focus_side: 'left' | 'center' | 'right';
};

type CalendarRow = {
  week_no: number;
  day_no: number;
  total_days: number;
};

type EventFeedRow = {
  id: number;
  category: CityEventFeedItem['category'];
  accent: CityEventFeedItem['accent'];
  title: string;
  detail: string | null;
  week_no: number;
  day_no: number;
  created_at: string;
};

type FinanceStateRow = {
  ticket_price: number;
  sponsor_tier: 'local' | 'regional' | 'global';
  sponsor_weekly_amount: number;
};

type ArenaFacilityRow = {
  level: number;
};

type EngagementRow = {
  streak: number;
  last_claim_day: number;
};

type CupTemplateRow = {
  id: string;
  name: string;
  prize_pool: number;
  entry_fee: number;
  max_teams: number;
};

type CupParticipantRow = {
  team_id: string;
};

type CupInstanceRow = {
  id: string;
  status: 'registration' | 'in_progress' | 'completed';
  pm_cup_templates: CupTemplateRow | CupTemplateRow[] | null;
  pm_cup_participants: CupParticipantRow[] | null;
};

type CupMatchTeamRow = {
  id?: string;
  name: string;
};

type CupMatchInstanceTemplateRow = {
  id: string;
  name: string;
};

type CupMatchInstanceRow = {
  id?: string;
  template_id?: string;
  status: 'registration' | 'in_progress' | 'completed';
  pm_cup_templates: CupMatchInstanceTemplateRow | CupMatchInstanceTemplateRow[] | null;
};

type CupMatchRow = {
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

type UntypedSupabaseQuery = PromiseLike<{ data: unknown; error: unknown }> & {
  select: (columns: string) => UntypedSupabaseQuery;
  or: (filters: string) => UntypedSupabaseQuery;
  eq: (column: string, value: unknown) => UntypedSupabaseQuery;
  in: (column: string, values: readonly string[]) => UntypedSupabaseQuery;
  order: (column: string, options?: { ascending?: boolean }) => UntypedSupabaseQuery;
};

type UntypedSupabaseClient = {
  from: (table: string) => UntypedSupabaseQuery;
};

function formatAttendance(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return String(value);
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function getPlayManagerCitySnapshot(
  teamId: string,
  options?: { mode?: PlayManagerCitySnapshotMode },
): Promise<PlayManagerCitySnapshot> {
  const mode = options?.mode ?? 'full';
  const isLineupOnly = mode === 'lineup';
  // 'light' keeps the cheap, always-needed slices (squad, standings, season,
  // finance, calendar, match settings, eventFeed) but drops the heavy ones that
  // a non-squad building (e.g. media/chat) never reads — market, transactions,
  // match history, academy, shortlist and cups.
  const isReduced = isLineupOnly || mode === 'light' || mode === 'residence';
  // 'residence' is like 'light' but keeps academy — the residence page renders
  // squad + academy + staff and nothing else, so it can skip everything else.
  const includeAcademy = !isReduced || mode === 'residence';
  const db = asPlayManagerDb(createSupabaseAdminClient());
  const admin = createSupabaseAdminClient();
  const untypedAdmin = admin as unknown as UntypedSupabaseClient;
  const [{ data: teamMetaRow }, { data: staffRows }] = await Promise.all([
    db
      .from<TeamMetaRow>('pm_teams')
      .select('division_id')
      .eq('id', teamId)
      .single(),
    db
      .from<StaffRow>('pm_staff')
      .select('role_key, level')
      .eq('team_id', teamId),
  ]);

  const divisionId = teamMetaRow?.division_id ?? 5;
  const maxStaffLevelByDivision = getMaxStaffLevelForDivision(divisionId);
  const staffBonuses = getStaffBonuses(
    (staffRows ?? []).map((row) => ({
      roleKey: row.role_key,
      level: row.level,
    })),
  );
  const marketLimit = Math.min(14, 8 + staffBonuses.marketExtraPlayers);
  const academyLimit = Math.min(10, 6 + staffBonuses.academyExtraProspects);

  const [{ data: squadRows }, { data: marketRows }, { data: transactionRows }, { data: standingRows }, { data: matchHistoryRows }, { data: seasonStateRow }, { data: academyRows }, { data: shortlistRows }, { data: matchSettingsRow }, { data: calendarRow }, { data: eventFeedRows }, { data: financeStateRow }, { data: cupRows }, { data: cupMatchRows }, { data: arenaFacilityRow }, { data: engagementRow }] = await Promise.all([
    db
      .from<SquadRow>('pm_squads')
      .select('id, shirt_number, squad_number, position, player:pm_players(id, normalized_name, display_name, card_display_name, primary_position, card_image_url, nationality_code, card_sil_width, card_sil_height, card_sil_x, card_sil_y, card_sil_opacity, card_content_y, card_name_size, card_stats_scale, card_stats, is_real, real_age, age, age_started_total_days, ovr_base, ovr_current, current_transfer_value_gel, fatigue, morale, injury_matches, status, talent)')
      .eq('team_id', teamId)
      .order('id', { ascending: true })
      .limit(18),
    isReduced
      ? Promise.resolve({ data: [] as MarketRow[] })
      : db
          .from<MarketRow>('pm_players')
          .select('id, normalized_name, display_name, card_display_name, primary_position, card_image_url, nationality_code, card_sil_width, card_sil_height, card_sil_x, card_sil_y, card_sil_opacity, card_content_y, card_name_size, card_stats_scale, card_stats, is_real, talent, ea_fc_ovr, real_age, age, age_started_total_days, ovr_current, current_transfer_value_gel, owner_id')
          .is('owner_id', null)
          .eq('status', 'active')
          .order('ovr_current', { ascending: false })
          .limit(marketLimit),
    isReduced
      ? Promise.resolve({ data: [] as TransactionRow[] })
      : db
          .from<TransactionRow>('pm_transactions')
          .select('amount, reason, created_at')
          .eq('team_id', teamId)
          .order('created_at', { ascending: false })
          .limit(8),
    db
      .from<StandingRow>('pm_season_rows')
      .select('club_name, played, points, form_percent, row_order')
      .eq('team_id', teamId)
      .order('row_order', { ascending: true })
      .limit(8),
    isReduced
      ? Promise.resolve({ data: [] as MatchHistoryRow[] })
      : db
          .from<MatchHistoryRow>('pm_match_history')
          .select('round_no, opponent_name, venue, scored, conceded, result, attendance, income, fan_mood, created_at')
          .eq('team_id', teamId)
          .order('round_no', { ascending: false })
          .limit(6),
      db
        .from<SeasonStateRow>('pm_season_state')
        .select('season_no, is_completed, last_finish, last_reward, last_outcome')
        .eq('team_id', teamId)
        .single(),
      !includeAcademy
        ? Promise.resolve({ data: [] as AcademyProspectRow[] })
        : db
            .from<AcademyProspectRow>('pm_academy_prospects')
            .select('id, player_id, normalized_name, display_name, position, age, talent, ovr_base, potential_ovr, signing_cost')
            .eq('team_id', teamId)
            .eq('status', 'active')
            .order('potential_ovr', { ascending: false })
            .limit(academyLimit),
      isReduced
        ? Promise.resolve({ data: [] as MarketShortlistRow[] })
        : db
            .from<MarketShortlistRow>('pm_market_shortlist')
            .select('player_key')
            .eq('team_id', teamId),
      db
        .from<MatchSettingsRow>('pm_match_settings')
        .select('tactical_style, defensive_line, tempo, focus_side')
        .eq('team_id', teamId)
        .single(),
      db
        .from<CalendarRow>('pm_calendar')
        .select('week_no, day_no, total_days')
        .eq('team_id', teamId)
        .single(),
      isLineupOnly
        ? Promise.resolve({ data: [] as EventFeedRow[] })
        : db
            .from<EventFeedRow>('pm_event_feed')
            .select('id, category, accent, title, detail, week_no, day_no, created_at')
            .eq('team_id', teamId)
            .order('created_at', { ascending: false })
            .limit(8),
      db
        .from<FinanceStateRow>('pm_finance_state')
        .select('ticket_price, sponsor_tier, sponsor_weekly_amount')
        .eq('team_id', teamId)
        .single(),
      isReduced
        ? Promise.resolve({ data: [] as CupInstanceRow[] })
        : (untypedAdmin
            .from('pm_cup_instances')
            .select(`
              id,
              status,
              pm_cup_templates ( id, name, prize_pool, entry_fee, max_teams ),
              pm_cup_participants ( team_id )
            `)
            .in('status', ['registration', 'in_progress', 'completed'])
            .order('created_at', { ascending: false })),
      isReduced
        ? Promise.resolve({ data: [] as CupMatchRow[] })
        : (untypedAdmin
            .from('pm_cup_matches')
            .select(`
              id,
              cup_instance_id,
              round,
              position,
              status,
              start_time,
              team1_id,
              team2_id,
              team1:pm_teams!team1_id(id, name),
              team2:pm_teams!team2_id(id, name),
              pm_cup_instances (
                id,
                template_id,
                status,
                pm_cup_templates ( id, name )
              )
            `)
            .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
            .in('status', ['ready', 'pending'])
            .order('start_time', { ascending: true })),
      db
        .from<ArenaFacilityRow>('pm_facilities')
        .select('level')
        .eq('team_id', teamId)
        .eq('sprite_key', 'arena')
        .maybeSingle(),
      db
        .from<EngagementRow>('pm_engagement')
        .select('streak, last_claim_day')
        .eq('team_id', teamId)
        .maybeSingle(),
    ]);

  const typedSquadRows = (squadRows ?? []) as SquadRow[];
  const typedMarketRows = (marketRows ?? []) as MarketRow[];
  const typedStandingRows = (standingRows ?? []) as StandingRow[];
  const typedMatchHistoryRows = (matchHistoryRows ?? []) as MatchHistoryRow[];
  const typedAcademyRows = (academyRows ?? []) as AcademyProspectRow[];
  const typedShortlistRows = (shortlistRows ?? []) as MarketShortlistRow[];
  const typedEventFeedRows = (eventFeedRows ?? []) as EventFeedRow[];
  const currentTotalDays = calendarRow?.total_days ?? null;
  const missingImageKeys = new Set<string>();
  typedSquadRows.forEach((row) => {
    if (row.player?.normalized_name && !row.player.card_image_url) missingImageKeys.add(row.player.normalized_name);
  });
  if (!isLineupOnly) {
    typedMarketRows.forEach((row) => {
      if (row.normalized_name && !row.card_image_url) missingImageKeys.add(row.normalized_name);
    });
  }
  const fallbackFaceByName = new Map(
    await Promise.all(
      [...missingImageKeys].map(async (normalizedName) => [normalizedName, await getEafc26PlayerFaceUrl(normalizedName)] as const),
    ),
  );
  const resolvedStatsByName = new Map(
    await Promise.all(
      [...new Set([
        ...typedSquadRows.map((row) => row.player?.normalized_name).filter(Boolean),
        ...typedMarketRows.map((row) => row.normalized_name).filter(Boolean),
      ])].map(async (normalizedName) => {
        const squadPlayer = typedSquadRows.find((row) => row.player?.normalized_name === normalizedName)?.player;
        const marketPlayer = typedMarketRows.find((row) => row.normalized_name === normalizedName);
        const dbStats = squadPlayer?.card_stats ?? marketPlayer?.card_stats ?? null;
        return [normalizedName, await resolveRealPlayerStats(normalizedName, dbStats)] as const;
      }),
    ),
  );
  const baseSquad: BaseSquadPlayer[] = typedSquadRows
    .filter((row): row is SquadRow & { player: NonNullable<SquadRow['player']> } => Boolean(row.player))
    .map((row) => {
      const effectiveTalent = getEffectiveRealPlayerTalent({
        isReal: row.player.is_real,
        storedAge: row.player.age,
        realAge: row.player.real_age,
        baseOvr: row.player.ovr_base,
        talent: row.player.talent,
      });
      const effectiveValue = getTalentClassAdjustedTransferValueGel(row.player.current_transfer_value_gel, effectiveTalent);
      return {
        squadId: row.id,
        id: row.player.id,
        normalizedName: row.player.normalized_name,
        name: row.player.display_name,
        cardDisplayName: row.player.card_display_name,
        cardImageUrl: row.player.card_image_url || fallbackFaceByName.get(row.player.normalized_name) || null,
        nationalityCode: row.player.nationality_code,
        cardEditorConfig: buildPlayManagerPlayerCardLayout(row.player),
        stats: (row.player.is_real ? resolvedStatsByName.get(row.player.normalized_name) : null) ?? row.player.card_stats,
        position: row.player.primary_position?.trim() || row.position,
        age: getPlayManagerDisplayAge({
          storedAge: row.player.age,
          isReal: row.player.is_real,
          ageStartedTotalDays: row.player.age_started_total_days,
          currentTotalDays,
        }),
        ovrBase: row.player.ovr_base,
        ovrCurrent: row.player.ovr_current,
        value: effectiveValue,
        valueLabel: formatGel(effectiveValue),
        fatigue: row.player.fatigue,
        morale: row.player.morale,
        injuryMatches: row.player.injury_matches,
        availability: row.player.status === 'injured' || row.player.injury_matches > 0 ? 'injured' : 'ready',
        lineupSlot: row.shirt_number,
        talent: effectiveTalent,
        squadNumber: row.squad_number,
      };
    });
  const hasPersistedLineup =
    baseSquad.length > 0 &&
    baseSquad.every((player) => player.lineupSlot !== null) &&
    new Set(baseSquad.map((player) => player.lineupSlot)).size === baseSquad.length;
  const { squad, starters, bench, reserves } = hasPersistedLineup
    ? pickPersistedLineup(baseSquad)
    : pickBestLineup(baseSquad);

  const ownedPlayerKeys = new Set(baseSquad.map((player) => player.normalizedName));
  const shortlistKeys = new Set(typedShortlistRows.map((row) => row.player_key));
  const liveMarket = isReduced ? [] : typedMarketRows
    .filter((row) => !ownedPlayerKeys.has(row.normalized_name))
    .map((row) => {
      const effectiveTalent = getEffectiveRealPlayerTalent({
        isReal: row.is_real,
        storedAge: row.age,
        realAge: row.real_age,
        baseOvr: row.ea_fc_ovr ?? row.ovr_current,
        talent: row.talent,
      });
      const effectiveValue = getTalentClassAdjustedTransferValueGel(row.current_transfer_value_gel, effectiveTalent);
      return {
        key: row.normalized_name,
        id: row.id,
        name: row.display_name,
        cardDisplayName: row.card_display_name,
        cardImageUrl: row.card_image_url || fallbackFaceByName.get(row.normalized_name) || null,
        nationalityCode: row.nationality_code,
        cardEditorConfig: buildPlayManagerPlayerCardLayout(row),
        stats: (row.is_real ? resolvedStatsByName.get(row.normalized_name) : null) ?? row.card_stats,
        position: normalizeMarketPosition(row.primary_position?.trim() || (row.normalized_name.includes('mamardashvili')
          ? 'GK'
          : row.normalized_name.includes('mbappe')
            ? 'ST'
            : row.normalized_name.includes('kvaratskhelia')
              ? 'LW'
              : row.normalized_name.includes('bellingham')
                ? 'CM'
                : 'CM')),
        age: getPlayManagerDisplayAge({
          storedAge: row.age,
          isReal: row.is_real,
          ageStartedTotalDays: row.age_started_total_days,
          currentTotalDays: null,
        }),
        ovr: row.ovr_current,
        talent: effectiveTalent,
        value: effectiveValue,
        valueLabel: formatGel(effectiveValue),
        demand: 'ბაზარზეა',
        available: row.owner_id === null,
        shortlisted: shortlistKeys.has(row.normalized_name),
      };
    });

  const seededMarket = isReduced ? [] : MARKET_TARGETS
    .filter((target) => !ownedPlayerKeys.has(target.normalizedName))
    .map((target) => {
      const value = getCurrentTransferValueGel(target.ovr, target.ovr);
      return {
        key: target.key,
        id: null,
        name: target.displayName,
        position: normalizeMarketPosition(target.position),
        age: target.age,
        ovr: target.ovr,
        talent: 10,
        value,
        valueLabel: formatGel(value),
        demand: target.demand,
        available: true,
        shortlisted: shortlistKeys.has(target.key) || shortlistKeys.has(target.normalizedName),
      };
    });

  const sortedStandingRows = [...typedStandingRows].sort((left, right) => {
    if (right.points !== left.points) return right.points - left.points;
    if (left.row_order !== right.row_order) return left.row_order - right.row_order;
    return left.club_name.localeCompare(right.club_name);
  });
  const standings = sortedStandingRows.map((row) => ({
    team: row.club_name,
    pts: row.points,
    played: row.played,
    formPercent: row.form_percent,
  }));
  const ownStandingRow = typedStandingRows.find((row) => row.row_order === 1);
  const nextOpponent = getPlayManagerNextOpponent(typedStandingRows, ownStandingRow?.played ?? 0);
  const matchHistory = isLineupOnly ? [] : typedMatchHistoryRows.map((row) => ({
    round: row.round_no,
    opponent: row.opponent_name,
    venue: row.venue,
    score: `${row.scored}-${row.conceded}`,
    result: row.result,
    attendance: row.attendance,
    attendanceLabel: formatAttendance(row.attendance),
    income: row.income,
    incomeLabel: formatGel(row.income),
    fanMood: row.fan_mood,
    createdAt: row.created_at,
  }));
  const academy = isLineupOnly ? [] : typedAcademyRows.map((row) => ({
    id: row.id,
    playerId: row.player_id ?? null,
    name: row.display_name,
    position: row.position,
    age: row.age,
    talent: row.talent,
    ovr: row.ovr_base,
    potential: row.potential_ovr,
    signingCost: row.signing_cost,
    signingCostLabel: formatGel(row.signing_cost),
  }));
  const averageSquadFatigue =
    squad.length > 0
      ? squad.map((player) => player.fatigue).reduce((sum, fatigue) => sum + fatigue, 0) / squad.length
      : 0;
  const averageSquadMorale =
    squad.length > 0
      ? squad.map((player) => player.morale).reduce((sum, morale) => sum + morale, 0) / squad.length
      : 72;
  const injuredCount = squad.filter((player) => player.availability === 'injured').length;
  const availableCount = squad.length - injuredCount;

  // Match readiness must mirror the LIVE league match engine
  // (pm_simulate_league_round) exactly — it is the number that actually shifts
  // xG there, not a cosmetic squad-wide stat like the morale/fatigue pills
  // above. The engine reads ONLY the starting XI (shirt_number <= 11), includes
  // an OVR term, and weighs morale/fatigue/injuries differently — this used to
  // diverge (whole-squad average, no OVR term, morale x0.52 vs x0.42, injured
  // x4 vs x7), so the manager's preview lied about what a match would actually
  // do, especially once bench/reserve morale started draining independently.
  const starterSquad = squad.filter((player) => player.role === 'starter');
  const starterAvgOvr =
    starterSquad.length > 0
      ? starterSquad.reduce((sum, player) => sum + player.ovrCurrent, 0) / starterSquad.length
      : 68;
  const starterAvgFatigue =
    starterSquad.length > 0
      ? starterSquad.reduce((sum, player) => sum + player.fatigue, 0) / starterSquad.length
      : 18;
  const starterAvgMorale =
    starterSquad.length > 0
      ? starterSquad.reduce((sum, player) => sum + player.morale, 0) / starterSquad.length
      : 78;
  const starterInjuredCount = starterSquad.filter((player) => player.availability === 'injured').length;
  const readiness = Math.max(
    35,
    Math.min(
      100,
      Math.round(
        (starterAvgOvr - 55) * 1.2 +
          starterAvgMorale * 0.42 -
          starterAvgFatigue * 0.38 -
          starterInjuredCount * 7 +
          staffBonuses.readinessFlat,
      ),
    ),
  );
  const ticketPrice = financeStateRow?.ticket_price ?? 28;
  const stadiumLevel = (arenaFacilityRow as ArenaFacilityRow | null)?.level ?? 1;

  const totalDays = (calendarRow as CalendarRow | null)?.total_days ?? 0;
  const engagement = engagementRow as EngagementRow | null;
  const engStreak = engagement?.streak ?? 0;
  const engLastDay = engagement?.last_claim_day ?? -1;
  const dailyCanClaim = engLastDay !== totalDays;
  const dailyNextStreak = engLastDay === totalDays - 1 ? Math.min(7, engStreak + 1) : 1;
  const dailyNextReward = 15_000 + dailyNextStreak * 7_000;

  const projectedAttendance = getProjectedAttendance({
    formPercent:
      ownStandingRow?.form_percent ??
      Math.max(
        45,
        100 - Math.round(averageSquadFatigue),
      ),
    readiness,
    ticketPrice,
    stadiumLevel,
  });
  const projectedMatchdayIncome = getProjectedMatchdayIncome({
    attendance: projectedAttendance,
    ticketPrice,
  });
  const boostedProjectedMatchdayIncome = Math.round(projectedMatchdayIncome * (1 + (staffBonuses.projectedIncomePct / 100)));
  const weeklyWages = getProjectedWeeklyWages(squad) + staffBonuses.totalWeeklyWages;
  const staffMembers = STAFF_ROLES.map((role) => {
    const hired = (staffRows ?? []).find((row) => row.role_key === role.key);
    const level = hired?.level ?? 0;
    const isHired = Boolean(hired);
    const currentLevel = Math.max(1, level || 1);
    const weeklyWage = isHired ? getStaffWeeklyWage(role.key, currentLevel) : getStaffWeeklyWage(role.key, 1);
    const upgradeCost = isHired && currentLevel < Math.min(5, maxStaffLevelByDivision)
      ? getStaffUpgradeCost(role.key, currentLevel)
      : null;

    return {
      roleKey: role.key,
      name: role.name,
      shortName: role.shortName,
      category: role.category,
      description: role.description,
      level,
      maxLevel: maxStaffLevelByDivision,
      isHired,
      hireCost: getStaffHireCost(role.key),
      hireCostLabel: formatGel(getStaffHireCost(role.key)),
      upgradeCost,
      upgradeCostLabel: upgradeCost ? formatGel(upgradeCost) : null,
      weeklyWage,
      weeklyWageLabel: formatGel(weeklyWage),
      benefitLabel: getStaffBenefitLabel(role.key, currentLevel),
    };
  });
  const typedCupRows = (cupRows ?? []) as CupInstanceRow[];
  const typedCupMatchRows = (cupMatchRows ?? []) as CupMatchRow[];
  const upcomingCupMatchRow = typedCupMatchRows.find((row) => {
    const instance = firstRelation(row.pm_cup_instances);
    return (
      row.status === 'ready' &&
      row.team1_id &&
      row.team2_id &&
      row.start_time &&
      instance?.status === 'in_progress'
    );
  });
  const upcomingCupMatch = upcomingCupMatchRow
    ? (() => {
        const instance = firstRelation(upcomingCupMatchRow.pm_cup_instances);
        const template = firstRelation(instance?.pm_cup_templates);
        const team1 = firstRelation(upcomingCupMatchRow.team1);
        const team2 = firstRelation(upcomingCupMatchRow.team2);

        return {
        id: upcomingCupMatchRow.id,
        cupId: upcomingCupMatchRow.cup_instance_id,
        templateId: instance?.template_id ?? '',
        cupName: template?.name ?? 'თასი',
        round: upcomingCupMatchRow.round,
        position: upcomingCupMatchRow.position,
        status: upcomingCupMatchRow.status,
        startTime: upcomingCupMatchRow.start_time,
        opponentTeamId: upcomingCupMatchRow.team1_id === teamId ? upcomingCupMatchRow.team2_id : upcomingCupMatchRow.team1_id,
        opponentName:
          upcomingCupMatchRow.team1_id === teamId
            ? team2?.name ?? 'მეტოქე'
            : team1?.name ?? 'მეტოქე',
        isHome: upcomingCupMatchRow.team1_id === teamId,
        };
      })()
    : null;

  // This team's own active transfer listings (for the outgoing module: view + unlist).
  type OutgoingListingRow = {
    id: string;
    asking_price: number;
    player: { id: string; display_name: string; primary_position: string | null; ovr_current: number }
      | { id: string; display_name: string; primary_position: string | null; ovr_current: number }[]
      | null;
  };
  const { data: outgoingListingRows } = isReduced
    ? { data: [] as OutgoingListingRow[] }
    : await untypedAdmin
        .from('pm_transfer_listings')
        .select('id, asking_price, player:pm_players(id, display_name, primary_position, ovr_current)')
        .eq('seller_team_id', teamId)
        // Live listings only. The status enum is 'active' | 'sold' | 'cancelled'
        // (see 20260626 migration) — the old 'listed' value never existed, so
        // this query always returned empty and sellers saw none of their listings.
        .eq('status', 'active')
        .order('created_at', { ascending: false });
  const outgoingListings: CityOutgoingListing[] = ((outgoingListingRows ?? []) as OutgoingListingRow[])
    .map((row) => {
      const player = Array.isArray(row.player) ? row.player[0] : row.player;
      if (!player) return null;
      const askingPrice = Math.max(0, Number(row.asking_price ?? 0));
      return {
        listingId: row.id,
        playerId: player.id,
        name: player.display_name,
        position: normalizeMarketPosition(player.primary_position),
        ovr: player.ovr_current,
        askingPrice,
        askingPriceLabel: formatGel(askingPrice),
      };
    })
    .filter((entry): entry is CityOutgoingListing => entry !== null);

  return {
    squad,
      starters,
      bench,
      reserves,
      formationLabel: '4-3-3',
      academy,
      market: liveMarket.length > 0 ? liveMarket : seededMarket,
      outgoingListings,
    transactions: isLineupOnly ? [] : (transactionRows ?? []).map((row) => ({
      amount: row.amount,
      amountLabel: `${row.amount > 0 ? '+' : ''}${formatGel(row.amount)}`,
      reason: row.reason,
      createdAt: row.created_at,
    })),
    matchHistory,
    standings,
    season: {
      seasonNo: seasonStateRow?.season_no ?? 1,
      isCompleted: seasonStateRow?.is_completed ?? false,
      lastFinish: seasonStateRow?.last_finish ?? null,
      lastReward: seasonStateRow?.last_reward ?? 0,
      lastRewardLabel: formatGel(seasonStateRow?.last_reward ?? 0),
      lastOutcome: seasonStateRow?.last_outcome ?? null,
    },
    clock: {
      weekNo: calendarRow?.week_no ?? 1,
      dayNo: calendarRow?.day_no ?? 1,
      totalDays: calendarRow?.total_days ?? 1,
      label: `კვირა ${calendarRow?.week_no ?? 1} · დღე ${calendarRow?.day_no ?? 1}`,
    },
    eventFeed: isLineupOnly ? [] : typedEventFeedRows.map((row) => ({
      id: row.id,
      category: row.category,
      accent: row.accent,
      title: row.title,
      detail: row.detail,
      weekNo: row.week_no,
      dayNo: row.day_no,
      createdAt: row.created_at,
    })),
    finance: {
      ticketPrice,
      sponsorTier: financeStateRow?.sponsor_tier ?? 'local',
      sponsorWeeklyAmount: financeStateRow?.sponsor_weekly_amount ?? 85_000,
      sponsorWeeklyAmountLabel: formatGel(financeStateRow?.sponsor_weekly_amount ?? 85_000),
      weeklyWages,
      weeklyWagesLabel: formatGel(weeklyWages),
      projectedAttendance,
      projectedAttendanceLabel: formatAttendance(projectedAttendance),
      projectedMatchdayIncome: boostedProjectedMatchdayIncome,
      projectedMatchdayIncomeLabel: formatGel(boostedProjectedMatchdayIncome),
      stadiumLevel,
      stadiumCapacity: getStadiumCapacity(stadiumLevel),
      stadiumCapacityLabel: formatAttendance(getStadiumCapacity(stadiumLevel)),
    },
    dailyReward: {
      canClaim: dailyCanClaim,
      streak: engStreak,
      nextStreak: dailyNextStreak,
      nextReward: dailyNextReward,
      nextRewardLabel: formatGel(dailyNextReward),
    },
    staff: {
      members: staffMembers,
      maxLevelByDivision: maxStaffLevelByDivision,
      totalWeeklyWages: staffBonuses.totalWeeklyWages,
      totalWeeklyWagesLabel: formatGel(staffBonuses.totalWeeklyWages),
      bonuses: staffBonuses,
    },
    matchSettings: {
      tacticalStyle: matchSettingsRow?.tactical_style ?? 'balanced',
      defensiveLine: matchSettingsRow?.defensive_line ?? 'mid',
      tempo: matchSettingsRow?.tempo ?? 'balanced',
      focusSide: matchSettingsRow?.focus_side ?? 'center',
      readiness,
      injuredCount,
      availableCount,
      avgMorale: Math.round(averageSquadMorale),
    },
    nextMatchLabel: `Round ${(ownStandingRow?.played ?? 0) + 1} · ${nextOpponent}`,
    formPercent:
      ownStandingRow?.form_percent ??
      Math.max(
        45,
        100 - Math.round(averageSquadFatigue),
      ),
    upcomingCupMatch: isLineupOnly ? null : upcomingCupMatch,
    cups: isLineupOnly ? [] : (() => {
      const mapped = typedCupRows.map((row) => {
        const template = firstRelation(row.pm_cup_templates);
        const participants = row.pm_cup_participants ?? [];
        if (!template) return null;

        return {
          id: row.id,
          templateId: template.id,
          name: template.name,
          prizePoolLabel: formatGel(template.prize_pool),
          entryFeeLabel: template.entry_fee > 0 ? formatGel(template.entry_fee) : 'უფასო',
          maxTeams: template.max_teams,
          participantCount: participants.length,
          isRegistered: participants.some((participant) => participant.team_id === teamId),
          status: row.status,
        };
      }).filter((value): value is NonNullable<typeof value> => value !== null);

      const championsCup = mapped.find((cup) => cup.templateId === 'champions_cup');
      const openCup = mapped.find((cup) => cup.status === 'registration' && cup.templateId !== 'champions_cup');
      const inProgressCup = mapped.find((cup) => cup.status === 'in_progress' && cup.templateId !== 'champions_cup');
      const completedCup = mapped.find((cup) => cup.status === 'completed' && cup.templateId !== 'champions_cup');

      const result = [];
      if (championsCup) result.push(championsCup);
      if (openCup) result.push(openCup);
      if (inProgressCup) result.push(inProgressCup);
      if (completedCup) result.push(completedCup);
      return result;
    })(),
  };
}
