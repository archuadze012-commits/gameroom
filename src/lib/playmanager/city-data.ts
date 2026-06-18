import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatGel, getCurrentTransferValueGel, getProjectedAttendance, getProjectedMatchdayIncome, getProjectedWeeklyWages } from './economy';
import { asPlayManagerDb } from './db';
import { MARKET_TARGETS } from './gameplay';
import { getPlayManagerNextOpponent } from './league';
import {
  STAFF_ROLE_MAP,
  STAFF_ROLES,
  getMaxStaffLevelForDivision,
  getStaffBenefitLabel,
  getStaffBonuses,
  getStaffHireCost,
  getStaffUpgradeCost,
  getStaffWeeklyWage,
  type StaffRoleKey,
} from './staff';

export type CitySquadPlayer = {
  squadId: number;
  id: string;
  name: string;
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
};

export type CityMarketPlayer = {
  key: string;
  id: string | null;
  name: string;
  position: string;
  age: number;
  ovr: number;
  value: number;
  valueLabel: string;
  demand: string;
  available: boolean;
  shortlisted: boolean;
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
  name: string;
  position: string;
  age: number;
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

type BaseSquadPlayer = Omit<CitySquadPlayer, 'role'> & {
  normalizedName: string;
};

type SquadRow = {
  id: number;
  shirt_number: number | null;
  position: string;
  player: {
    id: string;
    normalized_name: string;
    display_name: string;
    age: number;
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

type FacilityRow = {
  level: number;
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
  return position.toUpperCase();
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
  age: number;
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
  normalized_name: string;
  display_name: string;
  position: string;
  age: number;
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

function formatAttendance(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return String(value);
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function getPlayManagerCitySnapshot(teamId: string): Promise<PlayManagerCitySnapshot> {
  const db = asPlayManagerDb(createSupabaseAdminClient());
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

  const [{ data: squadRows }, { data: marketRows }, { data: transactionRows }, { data: standingRows }, { data: matchHistoryRows }, { data: seasonStateRow }, { data: academyRows }, { data: shortlistRows }, { data: matchSettingsRow }, { data: calendarRow }, { data: eventFeedRows }, { data: financeStateRow }, { data: cupRows }, { data: cupMatchRows }, { data: arenaFacilityRow }] = await Promise.all([
    db
      .from<SquadRow>('pm_squads')
      .select('id, shirt_number, position, player:pm_players(id, normalized_name, display_name, age, ovr_base, ovr_current, current_transfer_value_gel, fatigue, morale, injury_matches, status, talent)')
      .eq('team_id', teamId)
      .order('id', { ascending: true })
      .limit(18),
    db
      .from<MarketRow>('pm_players')
      .select('id, normalized_name, display_name, age, ovr_current, current_transfer_value_gel, owner_id')
      .is('owner_id', null)
      .eq('status', 'active')
      .order('ovr_current', { ascending: false })
      .limit(marketLimit),
    db
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
    db
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
      db
        .from<AcademyProspectRow>('pm_academy_prospects')
        .select('id, normalized_name, display_name, position, age, ovr_base, potential_ovr, signing_cost')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('potential_ovr', { ascending: false })
        .limit(academyLimit),
      db
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
      db
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
      (createSupabaseAdminClient() as any)
        .from('pm_cup_instances')
        .select(`
          id,
          status,
          pm_cup_templates ( id, name, prize_pool, entry_fee, max_teams ),
          pm_cup_participants ( team_id )
        `)
        .in('status', ['registration', 'in_progress', 'completed'])
        .order('created_at', { ascending: false }) as any,
      (createSupabaseAdminClient() as any)
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
        .order('start_time', { ascending: true }) as any,
      db
        .from<FacilityRow>('pm_facilities')
        .select('level')
        .eq('team_id', teamId)
        .eq('sprite_key', 'arena')
        .single(),
    ]);

  const baseSquad: BaseSquadPlayer[] = (squadRows ?? [])
    .filter((row): row is SquadRow & { player: NonNullable<SquadRow['player']> } => Boolean(row.player))
    .map((row) => ({
      squadId: row.id,
      id: row.player.id,
      normalizedName: row.player.normalized_name,
      name: row.player.display_name,
      position: row.position,
      age: row.player.age,
      ovrBase: row.player.ovr_base,
      ovrCurrent: row.player.ovr_current,
      value: row.player.current_transfer_value_gel,
      valueLabel: formatGel(row.player.current_transfer_value_gel),
      fatigue: row.player.fatigue,
      morale: row.player.morale,
      injuryMatches: row.player.injury_matches,
      availability: row.player.status === 'injured' || row.player.injury_matches > 0 ? 'injured' : 'ready',
      lineupSlot: row.shirt_number,
      talent: row.player.talent,
    }));
  const hasPersistedLineup =
    baseSquad.length > 0 &&
    baseSquad.every((player) => player.lineupSlot !== null) &&
    new Set(baseSquad.map((player) => player.lineupSlot)).size === baseSquad.length;
  const { squad, starters, bench, reserves } = hasPersistedLineup
    ? pickPersistedLineup(baseSquad)
    : pickBestLineup(baseSquad);

  const ownedPlayerKeys = new Set(baseSquad.map((player) => player.normalizedName));
  const shortlistKeys = new Set((shortlistRows ?? []).map((row) => row.player_key));
  const liveMarket = (marketRows ?? [])
    .filter((row) => !ownedPlayerKeys.has(row.normalized_name))
    .map((row) => ({
      key: row.normalized_name,
      id: row.id,
      name: row.display_name,
      position: row.normalized_name.includes('mamardashvili')
        ? 'GK'
        : row.normalized_name.includes('mbappe')
          ? 'ST'
          : row.normalized_name.includes('kvaratskhelia')
            ? 'LW'
            : row.normalized_name.includes('bellingham')
              ? 'CM'
              : 'CM',
      age: row.age,
      ovr: row.ovr_current,
      value: row.current_transfer_value_gel,
      valueLabel: formatGel(row.current_transfer_value_gel),
      demand: 'ბაზარზეა',
      available: row.owner_id === null,
      shortlisted: shortlistKeys.has(row.normalized_name),
    }));

  const seededMarket = MARKET_TARGETS
    .filter((target) => !ownedPlayerKeys.has(target.normalizedName))
    .map((target) => {
      const value = getCurrentTransferValueGel(target.ovr, target.ovr);
      return {
        key: target.key,
        id: null,
        name: target.displayName,
        position: target.position,
        age: target.age,
        ovr: target.ovr,
        value,
        valueLabel: formatGel(value),
        demand: target.demand,
        available: true,
        shortlisted: shortlistKeys.has(target.key) || shortlistKeys.has(target.normalizedName),
      };
    });

  const sortedStandingRows = [...(standingRows ?? [])].sort((left, right) => {
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
  const ownStandingRow = (standingRows ?? []).find((row) => row.row_order === 1);
  const nextOpponent = getPlayManagerNextOpponent(standingRows ?? [], ownStandingRow?.played ?? 0);
  const matchHistory = (matchHistoryRows ?? []).map((row) => ({
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
  const academy = (academyRows ?? []).map((row) => ({
    id: row.id,
    name: row.display_name,
    position: row.position,
    age: row.age,
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
  const baseReadiness = Math.max(
    35,
    Math.min(
      100,
      Math.round((averageSquadMorale * 0.52) + ((100 - averageSquadFatigue) * 0.38) - (injuredCount * 4)),
    ),
  );
  const readiness = Math.max(35, Math.min(100, baseReadiness + staffBonuses.readinessFlat));
  const ticketPrice = financeStateRow?.ticket_price ?? 28;
  const stadiumLevel = arenaFacilityRow?.level ?? 1;
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
  const upcomingCupMatchRow = (cupMatchRows || []).find((row: any) => {
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

  return {
    squad,
      starters,
      bench,
      reserves,
      formationLabel: '4-3-3',
      academy,
      market: liveMarket.length > 0 ? liveMarket : seededMarket,
    transactions: (transactionRows ?? []).map((row) => ({
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
    eventFeed: (eventFeedRows ?? []).map((row) => ({
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
    upcomingCupMatch,
    cups: (() => {
      const mapped = (cupRows || []).map((row: any) => {
        const template = firstRelation(row.pm_cup_templates);
        const participants = row.pm_cup_participants || [];
        if (!template) return null;

        return {
          id: row.id,
          templateId: template.id,
          name: template.name,
          prizePoolLabel: formatGel(template.prize_pool),
          entryFeeLabel: template.entry_fee > 0 ? formatGel(template.entry_fee) : 'უფასო',
          maxTeams: template.max_teams,
          participantCount: participants.length,
          isRegistered: participants.some((p: any) => p.team_id === teamId),
          status: row.status,
        };
      }).filter(Boolean);

      const championsCup = mapped.find((c: any) => c.templateId === 'champions_cup');
      const openCup = mapped.find((c: any) => c.status === 'registration' && c.templateId !== 'champions_cup');
      const inProgressCup = mapped.find((c: any) => c.status === 'in_progress' && c.templateId !== 'champions_cup');
      const completedCup = mapped.find((c: any) => c.status === 'completed' && c.templateId !== 'champions_cup');

      const result = [];
      if (championsCup) result.push(championsCup);
      if (openCup) result.push(openCup);
      if (inProgressCup) result.push(inProgressCup);
      if (completedCup) result.push(completedCup);
      return result;
    })(),
  };
}
