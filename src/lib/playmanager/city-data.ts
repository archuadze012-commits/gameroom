import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatGel, getCurrentTransferValueGel, getProjectedAttendance, getProjectedMatchdayIncome, getProjectedWeeklyWages, getStadiumCapacity, getTalentClassAdjustedTransferValueGel } from './economy';
import { getEafc26PlayerFaceUrl, resolveRealPlayerStats } from './eafc26-dataset';
import { MARKET_TARGETS } from './gameplay';
import { getPlayManagerNextOpponent } from './ai-opponents';
import { LISTING_STATUS } from './status';
import { buildPlayManagerPlayerCardLayout } from './player-card';
import { getEffectiveRealPlayerTalent, getPlayManagerDisplayAge } from './player-age';
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
import { pickBestLineup, pickPersistedLineup } from './city-lineup';
import type {
  AcademyProspectRow,
  ArenaFacilityRow,
  BaseSquadPlayer,
  CalendarRow,
  CityOutgoingListing,
  CupInstanceRow,
  CupMatchRow,
  EngagementRow,
  EventFeedRow,
  FinanceStateRow,
  MarketRow,
  MarketShortlistRow,
  MatchHistoryRow,
  MatchSettingsRow,
  PlayManagerCitySnapshot,
  PlayManagerCitySnapshotMode,
  SeasonStateRow,
  SquadRow,
  StandingRow,
  TransactionRow,
  UntypedSupabaseClient,
} from './city-data.types';
// Re-exported so existing callers can keep importing the snapshot type from
// '@/lib/playmanager/city-data' unchanged.
export type { PlayManagerCitySnapshot } from './city-data.types';

function normalizeMarketPosition(position: string | null | undefined) {
  const normalized = position?.trim().toUpperCase();
  if (normalized === 'CF') return 'ST';
  return normalized || 'CM';
}

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
  const db = createSupabaseAdminClient();
  // The two cup queries below embed multi-level, FK-disambiguated relations
  // (team1:pm_teams!team1_id(...), nested pm_cup_instances -> pm_cup_templates)
  // that the generated client's embed-type inference doesn't cleanly resolve;
  // kept as an explicit untyped escape hatch rather than fighting the inference.
  const untypedAdmin = db as unknown as UntypedSupabaseClient;
  const [{ data: teamMetaRow }, { data: staffRows }] = await Promise.all([
    db
      .from('pm_teams')
      .select('division_id')
      .eq('id', teamId)
      .single(),
    db
      .from('pm_staff')
      .select('role_key, level')
      .eq('team_id', teamId),
  ]);

  const divisionId = teamMetaRow?.division_id ?? 5;
  const maxStaffLevelByDivision = getMaxStaffLevelForDivision(divisionId);
  const staffBonuses = getStaffBonuses(
    (staffRows ?? []).map((row) => ({
      // role_key is app-enum-constrained in gameplay, but the DB column is a
      // plain CHECK-constrained text the generator can't narrow.
      roleKey: row.role_key as StaffRoleKey,
      level: row.level,
    })),
  );
  const marketLimit = Math.min(14, 8 + staffBonuses.marketExtraPlayers);
  const academyLimit = Math.min(10, 6 + staffBonuses.academyExtraProspects);

  const [{ data: squadRows }, { data: marketRows }, { data: transactionRows }, { data: standingRows }, { data: matchHistoryRows }, { data: seasonStateRow }, { data: academyRows }, { data: shortlistRows }, { data: matchSettingsRow }, { data: calendarRow }, { data: eventFeedRows }, { data: financeStateRow }, { data: cupRows }, { data: cupMatchRows }, { data: arenaFacilityRow }, { data: engagementRow }] = await Promise.all([
    db
      .from('pm_squads')
      .select('id, shirt_number, squad_number, position, player:pm_players(id, normalized_name, display_name, card_display_name, primary_position, card_image_url, nationality_code, card_sil_width, card_sil_height, card_sil_x, card_sil_y, card_sil_opacity, card_content_y, card_name_size, card_stats_scale, card_stats, is_real, real_age, age, age_started_total_days, ovr_base, ovr_current, current_transfer_value_gel, fatigue, morale, injury_matches, status, talent)')
      .eq('team_id', teamId)
      .order('id', { ascending: true })
      .limit(18),
    isReduced
      ? Promise.resolve({ data: [] as MarketRow[] })
      : db
          .from('pm_players')
          .select('id, normalized_name, display_name, card_display_name, primary_position, card_image_url, nationality_code, card_sil_width, card_sil_height, card_sil_x, card_sil_y, card_sil_opacity, card_content_y, card_name_size, card_stats_scale, card_stats, is_real, talent, ea_fc_ovr, real_age, age, age_started_total_days, ovr_current, current_transfer_value_gel, owner_id')
          .is('owner_id', null)
          .eq('status', 'active')
          // Match the full market route's pool exactly, so a player shown in the
          // city preview never vanishes in the market: real players only, no
          // admin-repack legends, and exclude legacy EAFC rows.
          .eq('is_real', true)
          .not('pending_repack', 'is', true)
          .or('ovr_source.is.null,ovr_source.neq.ea_fc,real_age.not.is.null')
          .order('ovr_current', { ascending: false })
          .limit(marketLimit),
    isReduced
      ? Promise.resolve({ data: [] as TransactionRow[] })
      : db
          .from('pm_transactions')
          .select('amount, reason, created_at')
          .eq('team_id', teamId)
          .order('created_at', { ascending: false })
          .limit(8),
    db
      .from('pm_season_rows')
      .select('club_name, played, points, form_percent, row_order')
      .eq('team_id', teamId)
      .order('row_order', { ascending: true })
      .limit(8),
    isReduced
      ? Promise.resolve({ data: [] as MatchHistoryRow[] })
      : db
          .from('pm_match_history')
          .select('round_no, opponent_name, venue, scored, conceded, result, attendance, income, fan_mood, created_at')
          .eq('team_id', teamId)
          .order('round_no', { ascending: false })
          .limit(6),
      db
        .from('pm_season_state')
        .select('season_no, is_completed, last_finish, last_reward, last_outcome')
        .eq('team_id', teamId)
        .single(),
      !includeAcademy
        ? Promise.resolve({ data: [] as AcademyProspectRow[] })
        : db
            .from('pm_academy_prospects')
            .select('id, player_id, normalized_name, display_name, position, age, talent, ovr_base, potential_ovr, signing_cost')
            .eq('team_id', teamId)
            .eq('status', 'active')
            .order('potential_ovr', { ascending: false })
            .limit(academyLimit),
      isReduced
        ? Promise.resolve({ data: [] as MarketShortlistRow[] })
        : db
            .from('pm_market_shortlist')
            .select('player_key')
            .eq('team_id', teamId),
      db
        .from('pm_match_settings')
        .select('tactical_style, defensive_line, tempo, focus_side')
        .eq('team_id', teamId)
        .single(),
      db
        .from('pm_calendar')
        .select('week_no, day_no, total_days')
        .eq('team_id', teamId)
        .single(),
      isLineupOnly
        ? Promise.resolve({ data: [] as EventFeedRow[] })
        : db
            .from('pm_event_feed')
            .select('id, category, accent, title, detail, week_no, day_no, created_at')
            .eq('team_id', teamId)
            .order('created_at', { ascending: false })
            .limit(8),
      db
        .from('pm_finance_state')
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
        .from('pm_facilities')
        .select('level')
        .eq('team_id', teamId)
        .eq('sprite_key', 'arena')
        .maybeSingle(),
      db
        .from('pm_engagement')
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
        // Live listings only — LISTING_STATUS is the single source of truth for
        // the 'active' | 'sold' | 'cancelled' enum. The old hand-typed 'listed'
        // never existed, so this query returned empty and sellers saw no listings.
        .eq('status', LISTING_STATUS.active)
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
      // last_outcome is CHECK-constrained in the DB but comes back as plain
      // text from the generator; narrow to the app's own union.
      lastOutcome: (seasonStateRow?.last_outcome as SeasonStateRow['last_outcome']) ?? null,
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
      sponsorTier: (financeStateRow?.sponsor_tier as FinanceStateRow['sponsor_tier']) ?? 'local',
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
      // All four columns are CHECK-constrained text; narrow to the app unions.
      tacticalStyle: (matchSettingsRow?.tactical_style as MatchSettingsRow['tactical_style']) ?? 'balanced',
      defensiveLine: (matchSettingsRow?.defensive_line as MatchSettingsRow['defensive_line']) ?? 'mid',
      tempo: (matchSettingsRow?.tempo as MatchSettingsRow['tempo']) ?? 'balanced',
      focusSide: (matchSettingsRow?.focus_side as MatchSettingsRow['focus_side']) ?? 'center',
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

            return mapped.sort((a, b) => {
        if (a.templateId === 'champions_cup' && b.templateId !== 'champions_cup') return -1;
        if (b.templateId === 'champions_cup' && a.templateId !== 'champions_cup') return 1;

        const weights: Record<string, number> = {
          registration: 1,
          in_progress: 2,
          completed: 3,
        };
        return (weights[a.status] ?? 4) - (weights[b.status] ?? 4);
      });
    })(),
  };
}
