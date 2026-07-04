'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { clampTicketPriceGel, getCurrentTransferValueGel } from '@/lib/playmanager/economy';
import { normalizePlayManagerPosition } from '@/lib/playmanager/secondary-positions';
import type { TeamFacilityState } from '@/lib/playmanager/facilities';
import {
  MARKET_TARGETS,
  isFacilityKey,
  type CityActionKey,
  type FacilityKey,
  type FacilityStatus,
} from '@/lib/playmanager/gameplay';
import {
  getActionRewardBonusPct,
  getCityActionXpReward,
  getCombinedClubEffects,
  getManagerProgression,
} from '@/lib/playmanager/progression';
import {
  STAFF_ROLE_MAP,
  type StaffRoleKey,
} from '@/lib/playmanager/staff';
import { getTeam } from '@/lib/playmanager/team';
import { hasPermission } from '@/lib/admin';
import { createLeague, joinLeague, startLeague } from '@/lib/playmanager/leagues';
import { playNextFixtureForTeam, type PlayedFixture } from '@/lib/playmanager/next-fixture';

export type RunCityActionResult =
  | {
      success: true;
      facility: {
        spriteKey: FacilityKey;
        level: number;
        progress: number;
        status: FacilityStatus;
      };
      reward: number;
      cost: number;
      detail?: string;
      matchResult?: MatchResult;
    }
  | {
      success: false;
      error: 'unauthenticated' | 'team_missing' | 'invalid_facility' | 'insufficient_funds' | 'facility_locked' | 'already_done_today' | 'unavailable';
    };

export type MatchResult = {
  season: number;
  round: number;
  opponent: string;
  score: string;
  result: 'W' | 'D' | 'L';
  attendance: number;
  income: number;
  formPercent: number;
  readiness?: number;
  tacticalStyle?: string;
  injuryUpdate?: { playerName: string; matches: number } | null;
  recoveredCount?: number;
  seasonSummary?: {
    rank: number;
    reward: number;
    outcome: 'promoted' | 'relegated' | 'stayed';
    division: number;
  } | null;
  matchEngine?: {
    homeXg: number;
    awayXg: number;
    tactics: {
      homeStyle: string;
      opponentStyle: string;
      styleMatchup: number;
      styleFit: number;
      teamTac: number;
      tacFactor: number;
      attackMod: number;
      concedeMod: number;
      positionFit?: number;
    };
    profile?: {
      autoSubs?: { out: string; in: string; slot: string }[];
      traits?: { key: string; count: number }[];
    } | null;
    playerEvents?: {
      goalscorers?: { playerId: string; name: string; goals: number }[];
      ratings?: { playerId: string; name: string; position: string; rating: number }[];
    } | null;
  } | null;
};

type RpcCityActionResult = {
  spriteKey: FacilityKey;
  level: number;
  progress: number;
  status: FacilityStatus;
  reward: number;
  cost: number;
};


// Returned by pm_run_city_action_full: action + league sim + applied bonuses, all in one transaction.
type RpcCityActionFull = {
  action: RpcCityActionResult;
  season: MatchResult | null;
  extraCredit: number;
  xp: number;
  calendar: { weekNo: number; dayNo: number; totalDays: number } | null;
};

export type PlayManagerPlayerActionResult =
  | {
      success: true;
      message: string;
      amount?: number;
      players?: unknown[];
      // Set by trainPlayManagerPlayer only — lets the UI flash the exact stat
      // that changed, or show a "+N XP" toast when a session banked XP without
      // buying a stat point yet.
      improvedStats?: string[];
      devXpGranted?: number;
    }
  | {
      success: false;
      error:
        | 'unauthenticated'
        | 'team_missing'
        | 'invalid_player'
        | 'insufficient_funds'
        | 'player_unavailable'
        | 'player_owned'
        | 'insufficient_fodder'
        | 'no_upgrade_available'
        | 'unavailable';
      message?: string;
    };

type ActionContext = {
  bonuses: ReturnType<typeof getCombinedClubEffects>['bonuses'];
};

type CalendarAdvance = {
  weekNo: number;
  dayNo: number;
  totalDays: number;
};

type TrainPlayerRpcResult = {
  playerId: string;
  ovrCurrent: number;
  currentTransferValueGel: number;
  fatigue: number;
  morale: number;
  ovrGain?: number;
  statGain?: number;
  improvedStats?: string[];
  pendingOvr?: number;
  upgradable?: boolean;
  xpGranted?: number;
  xpBanked?: number;
  staffTrainingBonusPct?: number;
  matchesPlayed?: number;
};

function getPercentBonusAmount(amount: number, pct: number) {
  if (amount <= 0 || pct <= 0) return 0;
  return Math.round(amount * (pct / 100));
}

function getXpRewardWithTrainingBonus(baseXp: number, trainingBonusPct: number, trainingAffected: boolean) {
  if (baseXp <= 0) return 0;
  if (!trainingAffected || trainingBonusPct <= 0) return baseXp;
  return baseXp + Math.round(baseXp * (trainingBonusPct / 100));
}

async function getActionContext(userId: string, teamId: string): Promise<ActionContext> {
  const db = createSupabaseAdminClient();
  const [{ data: profile }, { data: facilityRows }] = await Promise.all([
    db.from('profiles').select('xp').eq('id', userId).single(),
    db.from('pm_facilities')
      .select('sprite_key, level, progress, status')
      .eq('team_id', teamId),
  ]);

  // sprite_key/status are DB CHECK-constrained text; narrow to the app unions.
  const facilities: TeamFacilityState[] = (facilityRows ?? []).map((row) => ({
    spriteKey: row.sprite_key as TeamFacilityState['spriteKey'],
    level: row.level,
    progress: row.progress,
    status: row.status as TeamFacilityState['status'],
  }));
  const manager = getManagerProgression(profile?.xp ?? 0);
  return {
    bonuses: getCombinedClubEffects(manager, facilities).bonuses,
  };
}

async function applyPostActionRewards(input: {
  userId: string;
  teamId: string;
  xpReward?: number;
  extraCredit?: number;
  creditReason?: string;
}) {
  const db = createSupabaseAdminClient();
  // The real client's .rpc() returns a thenable query builder, not a nominal
  // Promise (it's missing .catch/.finally) — PromiseLike is the correct, looser
  // structural type here, and Promise.allSettled accepts it just as well.
  const jobs: { label: string; run: PromiseLike<{ error: { message: string } | null }> }[] = [];
  if (input.xpReward && input.xpReward > 0) {
    jobs.push({ label: 'award_xp', run: db.rpc('award_xp', { p_user_id: input.userId, p_amount: input.xpReward }) });
  }
  if (input.extraCredit && input.extraCredit > 0) {
    jobs.push({
      label: 'pm_credit',
      run: db.rpc('pm_credit', {
        p_team_id: input.teamId,
        p_amount: input.extraCredit,
        p_reason: input.creditReason ?? 'playmanager_bonus',
      }),
    });
  }
  if (jobs.length === 0) return;

  // Best-effort, but never silent: a failed XP/credit award is a lost reward the
  // player earned — surface it so it shows up in logs/monitoring instead of vanishing.
  const settled = await Promise.allSettled(jobs.map((job) => job.run));
  settled.forEach((result, index) => {
    const label = jobs[index].label;
    if (result.status === 'rejected') {
      console.error(`[playmanager] reward job "${label}" threw`, { teamId: input.teamId, error: result.reason });
    } else if (result.value?.error) {
      console.error(`[playmanager] reward job "${label}" failed`, { teamId: input.teamId, error: result.value.error.message });
    }
  });
}

async function advancePlayManagerTime(teamId: string, days = 1) {
  const db = createSupabaseAdminClient();
  const { data: rawData, error: advanceError } = await db.rpc('pm_advance_time', {
    p_team_id: teamId,
    p_days: days,
  });
  if (advanceError) {
    console.error('[playmanager] pm_advance_time failed', { teamId, error: advanceError.message });
  }
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as CalendarAdvance | null;
  // Downstream lifecycle jobs — each is best-effort, but never silent: a failure
  // in morale drain / academy maturation / career-end / skill development is a
  // lost world-tick, so surface it in logs/monitoring instead of vanishing.
  //  - morale drain: bench/reserve lose morale while time passes (starters stay).
  //  - academy: prospects mature (scaled by academy facility level).
  //  - career-end: notify on final season, auto-resolve players who age out.
  //  - skill development: the assistant grows squad skill-moves toward each cap.
  const jobs = [
    { label: 'pm_apply_squad_morale_drain', run: db.rpc('pm_apply_squad_morale_drain', { p_team_id: teamId, p_days: days }) },
    { label: 'pm_develop_academy_prospects', run: db.rpc('pm_develop_academy_prospects', { p_team_id: teamId, p_days: days }) },
    { label: 'pm_process_career_ends', run: db.rpc('pm_process_career_ends', { p_team_id: teamId, p_days: days }) },
    { label: 'pm_grant_skill_development', run: db.rpc('pm_grant_skill_development', { p_team_id: teamId, p_days: days }) },
  ];
  const settled = await Promise.allSettled(jobs.map((job) => job.run));
  settled.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`[playmanager] time-advance job "${jobs[i].label}" threw`, { teamId, error: result.reason });
    } else if (result.value?.error) {
      console.error(`[playmanager] time-advance job "${jobs[i].label}" failed`, { teamId, error: result.value.error.message });
    }
  });
  return data ?? null;
}

async function logPlayManagerEvent(input: {
  teamId: string;
  category: 'match' | 'medical' | 'finance' | 'academy' | 'media' | 'board' | 'system';
  accent: 'green' | 'red' | 'gold';
  title: string;
  detail?: string | null;
  // Optional deep-link the notifications page renders as a clickable target.
  href?: string | null;
}) {
  const db = createSupabaseAdminClient();
  await db.rpc('pm_log_event', {
    p_team_id: input.teamId,
    p_category: input.category,
    p_title: input.title,
    p_detail: input.detail ?? undefined,
    p_accent: input.accent,
    p_href: input.href ?? undefined,
  });
}

export async function runPlayManagerCityAction(input: {
  spriteKey: string;
  action: CityActionKey;
}): Promise<RunCityActionResult> {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!isFacilityKey(input.spriteKey)) return { success: false, error: 'invalid_facility' };

  const team = await getTeam(user.id);
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const actionContext = await getActionContext(user.id, team.id);

  // One atomic RPC: core action + (optional) league sim + XP + bonus credit + time
  // advance, all in a single transaction. The bonus engine stays in TS — only the
  // resulting percentages cross into SQL, where they are applied as plain arithmetic.
  const { data: rpcData, error } = await db.rpc('pm_run_city_action_full', {
    p_team_id: team.id,
    p_sprite_key: input.spriteKey,
    p_action: input.action,
    p_user_id: user.id,
    p_action_reward_bonus_pct: getActionRewardBonusPct(input.action, actionContext.bonuses),
    p_season_reward_bonus_pct: actionContext.bonuses.seasonRewardPct,
    p_xp_base: getCityActionXpReward(input.action),
    p_training_xp_pct: actionContext.bonuses.trainingXpPct,
    p_training_affected: input.action === 'training_session',
    p_advance_days: input.action === 'league_sim' ? 2 : 1,
  });

  if (error || !rpcData) {
    const message = error?.message ?? 'unavailable';
    if (message.includes('insufficient_funds')) return { success: false, error: 'insufficient_funds' };
    if (message.includes('facility_locked')) return { success: false, error: 'facility_locked' };
    if (message.includes('already_done_today')) return { success: false, error: 'already_done_today' };
    if (message.includes('invalid_facility')) return { success: false, error: 'invalid_facility' };
    return { success: false, error: 'unavailable' };
  }
  // pm_run_city_action_full returns jsonb — the generator can't see its shape,
  // so narrow to the RPC's known result contract.
  const data = rpcData as unknown as RpcCityActionFull;

  const facilityResult = data.action;
  const extraCredit = data.extraCredit ?? 0;
  const xpReward = data.xp ?? 0;
  const calendar = data.calendar;
  let detail: string | undefined;

  const seasonData = data.season;
  if (input.action === 'league_sim' && seasonData) {
    detail = `R${seasonData.round} · ${seasonData.score} · ${seasonData.result} · ფორმა ${seasonData.formPercent}%`;
    if (typeof seasonData.income === 'number' && seasonData.income > 0) {
      detail = `${detail} · შემოსავალი +${seasonData.income.toLocaleString('ka-GE')} ₾`;
    }
    if (typeof seasonData.readiness === 'number') {
      detail = `${detail} · readiness ${seasonData.readiness}%`;
    }
    if (seasonData.tacticalStyle) {
      detail = `${detail} · ${seasonData.tacticalStyle}`;
    }
    if (seasonData.recoveredCount && seasonData.recoveredCount > 0) {
      detail = `${detail} · დაბრუნდა ${seasonData.recoveredCount}`;
    }
    if (seasonData.injuryUpdate?.playerName) {
      detail = `${detail} · ტრავმა ${seasonData.injuryUpdate.playerName} (${seasonData.injuryUpdate.matches})`;
    }
    if (seasonData.seasonSummary) {
      detail = `${detail} · Season ${seasonData.season} დასრულდა · #${seasonData.seasonSummary.rank} · ${seasonData.seasonSummary.outcome}`;
    }
  }

  const detailParts = [detail];
  if (extraCredit > 0) detailParts.push(`bonus +${extraCredit.toLocaleString('ka-GE')} ₾`);
  if (xpReward > 0) detailParts.push(`XP +${xpReward}`);
  if (calendar) detailParts.push(`კვირა ${calendar.weekNo} · დღე ${calendar.dayNo}`);
  detail = detailParts.filter(Boolean).join(' · ') || undefined;

  if (input.action === 'league_sim') {
    await logPlayManagerEvent({
      teamId: team.id,
      category: 'match',
      accent: facilityResult.reward > 0 ? 'green' : 'gold',
      title: `Matchday დასრულდა · ${detailParts[0] ?? 'League round'}`,
      detail,
    });
  } else if (input.action === 'finance_sponsor') {
    await logPlayManagerEvent({
      teamId: team.id,
      category: 'finance',
      accent: 'gold',
      title: 'სპონსორის შეხვედრა დასრულდა',
      detail,
    });
  } else if (input.action === 'media_campaign') {
    await logPlayManagerEvent({
      teamId: team.id,
      category: 'media',
      accent: 'green',
      title: 'მედია კამპანია გაუშვი',
      detail,
    });
  } else if (input.action === 'training_session') {
    await logPlayManagerEvent({
      teamId: team.id,
      category: 'board',
      accent: 'green',
      title: 'გუნდმა სრული სავარჯიშო სესია ჩაატარა',
      detail,
    });
  }

  revalidatePath('/playmanager');
  return {
    success: true,
    facility: {
      spriteKey: facilityResult.spriteKey,
      level: facilityResult.level,
      progress: facilityResult.progress,
      status: facilityResult.status,
    },
    reward: facilityResult.reward,
    cost: facilityResult.cost,
    detail,
    ...(input.action === 'league_sim' && seasonData ? { matchResult: seasonData } : {}),
  };
}

async function getAuthenticatedTeam() {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { user: null, team: null };
  return { user, team: await getTeam(user.id) };
}

export async function buyPlayManagerMarketPlayer(playerKey: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();

  // The market shows thousands of real DB free agents (keyed by normalized_name),
  // not just the four static seed targets — so resolve the buy against the actual
  // unowned pool. pm_buy_market_player claims the existing row by normalized_name;
  // MARKET_TARGETS stays as a fallback for the seed players.
  const { data: dbRows } = await db
    .from('pm_players')
    .select('normalized_name, display_name, primary_position, is_real, talent, ea_fc_ovr, ovr_base, ovr_current, age, current_transfer_value_gel')
    .eq('normalized_name', playerKey)
    .is('owner_id', null)
    .eq('status', 'active')
    .not('pending_repack', 'is', true)
    .limit(1);
  const dbPlayer = dbRows?.[0] ?? null;
  const target = MARKET_TARGETS.find((player) => player.key === playerKey || player.normalizedName === playerKey);
  if (!dbPlayer && !target) return { success: false, error: 'invalid_player' };

  const price = dbPlayer
    ? Math.max(1, dbPlayer.current_transfer_value_gel ?? getCurrentTransferValueGel(dbPlayer.ovr_current, dbPlayer.ovr_current))
    : getCurrentTransferValueGel(target!.ovr, target!.ovr);
  const displayName = dbPlayer?.display_name || target?.displayName || playerKey;
  const normalizedName = dbPlayer?.normalized_name ?? target!.normalizedName;

  const playerPayload = dbPlayer
    ? {
        normalized_name: dbPlayer.normalized_name,
        display_name: dbPlayer.display_name ?? dbPlayer.normalized_name,
        position: normalizePlayManagerPosition(dbPlayer.primary_position),
        is_real: dbPlayer.is_real ?? true,
        talent: dbPlayer.talent ?? 8,
        ea_fc_ovr: dbPlayer.ea_fc_ovr,
        ovr_source: 'ea_fc',
        ovr_base: dbPlayer.ovr_base ?? dbPlayer.ovr_current,
        ovr_current: dbPlayer.ovr_current,
        age: dbPlayer.age ?? 18,
        current_transfer_value_gel: price,
      }
    : {
        normalized_name: target!.normalizedName,
        display_name: target!.displayName,
        position: target!.position,
        is_real: true,
        talent: 10,
        ea_fc_ovr: target!.ovr,
        ovr_source: 'ea_fc',
        ovr_base: target!.ovr,
        ovr_current: target!.ovr,
        age: target!.age,
        current_transfer_value_gel: price,
      };

  const actionContext = await getActionContext(user.id, team.id);
  const { error } = await db.rpc('pm_buy_market_player', {
    p_team_id: team.id,
    p_player: playerPayload,
  });

  if (error) return mapPlayerActionError(error.message);
  // The discount refund MUST stay strictly below the 15% resale spread
  // (pm_sell_player pays 85% of sticker). A freshly bought market player is
  // stored at full sticker value and instantly resellable, so if the refund
  // ever reached ≥15% a buy→sell round-trip would print money. The manager +
  // market-facility discount can reach 18%+, so clamp it here at 14%.
  const rawRefund = getPercentBonusAmount(price, actionContext.bonuses.transferDiscountPct);
  const refund = Math.min(rawRefund, Math.floor(price * 0.14));
  const xpReward = 18;
  await applyPostActionRewards({
    userId: user.id,
    teamId: team.id,
    xpReward,
    extraCredit: refund,
    creditReason: `market_discount:${normalizedName}`,
  });
  const calendar = await advancePlayManagerTime(team.id, 1);
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'gold',
    title: `${displayName} დაემატა გუნდს`,
    detail: `${price.toLocaleString('ka-GE')} ₾ deal${refund > 0 ? ` · refund ${refund.toLocaleString('ka-GE')} ₾` : ''}${calendar ? ` · კვირა ${calendar.weekNo} · დღე ${calendar.dayNo}` : ''}`,
  });
  revalidatePath('/playmanager');
  return {
    success: true,
    message: `${displayName} დაემატა გუნდს${refund > 0 ? ` · discount refund ${refund.toLocaleString('ka-GE')} ₾` : ''} · XP +${xpReward}`,
    amount: -(price - refund),
  };
}

export async function trainPlayManagerPlayer(playerId: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const actionContext = await getActionContext(user.id, team.id);
  const { data: rawData, error } = await db.rpc('pm_train_player', {
    p_team_id: team.id,
    p_player_id: playerId,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as TrainPlayerRpcResult | null;

  if (error) return mapPlayerActionError(error.message);
  const xpReward = getXpRewardWithTrainingBonus(18, actionContext.bonuses.trainingXpPct, true);
  await applyPostActionRewards({
    userId: user.id,
    teamId: team.id,
    xpReward,
  });
  // Training no longer raises OVR directly, and no longer grants a guaranteed
  // free stat point — it banks a session's worth of development XP into the
  // SAME budget/cost curve match development uses (pm_players.xp), so a
  // session often just accumulates toward the next point rather than buying
  // one outright. This is deliberate: training used to be far faster than
  // playing matches for the same pending-stat pipeline.
  const statGain = Math.max(0, data?.statGain ?? 0);
  const pendingOvr = data?.pendingOvr;
  const upgradable = data?.upgradable === true;
  const devXpGranted = data?.xpGranted;
  const devXpBanked = data?.xpBanked;
  const managerXpReward = xpReward; // profiles.xp (manager level) — a separate pool from player dev XP.
  // Training is now one session per player per league match, so there is no
  // team-wide session counter to surface — the next session unlocks after the
  // next matchday.
  const sessionsLabel = ' · შემდეგი სესია მატჩის შემდეგ';
  const pendingLabel = pendingOvr != null ? ` · pending OVR ${pendingOvr}${upgradable ? ' ✦' : ''}` : '';
  const devLabel =
    statGain > 0
      ? `მინი-სტატი +${statGain}`
      : devXpGranted != null && devXpBanked != null
        ? `+${devXpGranted} dev XP (${devXpBanked} დაგროვილი)`
        : 'ვარჯიში ჩატარდა';
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'board',
    accent: 'green',
    title: statGain > 0 ? 'ვარჯიში: მინი-სტატები გაუმჯობესდა' : 'ვარჯიში: XP დაგროვდა',
    detail: `${devLabel} · მენეჯერის XP +${managerXpReward}${pendingLabel}${sessionsLabel}`,
  });
  revalidatePath('/playmanager');
  return {
    success: true,
    message: upgradable
      ? `${devLabel}${pendingLabel} — ასაწევია ასისტენტთან fodder-ით${sessionsLabel}`
      : `${devLabel}${pendingLabel}${sessionsLabel}`,
    improvedStats: statGain > 0 ? data?.improvedStats : undefined,
    devXpGranted: statGain === 0 ? devXpGranted : undefined,
  };
}

export async function openPlayManagerPack(packId: number): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc('pm_open_pack', {
    p_team_id: team.id,
    p_pack_id: packId,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { count: number; cost: number; received: string[] } | null;
  if (error) return mapPlayerActionError(error.message);

  const receivedIds = Array.isArray(data?.received) ? data.received : [];
  let players: unknown[] = [];
  if (receivedIds.length > 0) {
    const { data: cards } = await db
      .from('pm_players')
      .select('id,display_name,ovr_current,talent,primary_position,nationality_code,card_image_url')
      .in('id', receivedIds);
    // Preserve draw order from the RPC's received array.
    const byId = new Map((cards ?? []).map((c) => [c.id, c]));
    players = receivedIds.map((id) => byId.get(id)).filter(Boolean);
  }

  await logPlayManagerEvent({
    teamId: team.id,
    category: 'board',
    accent: 'gold',
    title: 'პაკი გაიხსნა',
    detail: `${data?.count ?? 0} ბარათი${(data?.cost ?? 0) > 0 ? ` · -${(data?.cost ?? 0).toLocaleString('ka-GE')} ₾` : ''}`,
  });
  revalidatePath('/playmanager');
  return {
    success: true,
    message: `პაკი გაიხსნა · ${data?.count ?? 0} ბარათი`,
    amount: -(data?.cost ?? 0),
    players,
  };
}

export async function confirmPlayManagerOvrUpgrade(
  playerId: string,
  fodderIds: string[],
): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc(
    'pm_confirm_ovr_upgrade',
    { p_team_id: team.id, p_player_id: playerId, p_fodder_ids: fodderIds },
  );
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { oldOvr: number; newOvr: number; fodderConsumed: number } | null;
  if (error) return mapPlayerActionError(error.message);

  await logPlayManagerEvent({
    teamId: team.id,
    category: 'board',
    accent: 'green',
    title: 'OVR აფგრეიდი დადასტურდა',
    detail: `OVR ${data?.oldOvr} → ${data?.newOvr} · ${data?.fodderConsumed} Pro ბარათი შეიწირა`,
  });
  revalidatePath('/playmanager');
  return {
    success: true,
    message: `OVR ${data?.oldOvr} → ${data?.newOvr} · ${data?.fodderConsumed} Pro ბარათი`,
  };
}

export async function signPlayManagerAcademyProspect(prospectId: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const actionContext = await getActionContext(user.id, team.id);
  const { data: rawData, error } = await db.rpc('pm_sign_academy_prospect', {
    p_team_id: team.id,
    p_prospect_id: prospectId,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { cost: number } | null;

  if (error) return mapPlayerActionError(error.message);
  const refund = getPercentBonusAmount(data?.cost ?? 0, actionContext.bonuses.transferDiscountPct);
  const xpReward = 16;
  await applyPostActionRewards({
    userId: user.id,
    teamId: team.id,
    xpReward,
    extraCredit: refund,
    creditReason: `academy_discount:${prospectId}`,
  });
  const calendar = await advancePlayManagerTime(team.id, 1);
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'academy',
    accent: 'green',
    title: 'აკადემიის ტალანტი მთავარ გუნდში გადავიდა',
    detail: `${data?.cost?.toLocaleString('ka-GE') ?? 0} ₾ signing${refund > 0 ? ` · refund ${refund.toLocaleString('ka-GE')} ₾` : ''}${calendar ? ` · კვირა ${calendar.weekNo} · დღე ${calendar.dayNo}` : ''}`,
  });
  revalidatePath('/playmanager');
  return {
    success: true,
    message: `ახალგაზრდა ფეხბურთელი აკადემიიდან დაემატა${refund > 0 ? ` · refund ${refund.toLocaleString('ka-GE')} ₾` : ''} · XP +${xpReward}`,
    amount: -((data?.cost ?? 0) - refund),
  };
}

export async function sellPlayManagerPlayer(playerId: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc('pm_sell_player', {
    p_team_id: team.id,
    p_player_id: playerId,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { amount: number } | null;

  if (error) return mapPlayerActionError(error.message);
  const xpReward = 12;
  await applyPostActionRewards({
    userId: user.id,
    teamId: team.id,
    xpReward,
  });
  const calendar = await advancePlayManagerTime(team.id, 1);
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'red',
    title: 'ფეხბურთელი გაიყიდა',
    detail: `${(data?.amount ?? 0).toLocaleString('ka-GE')} ₾ დაბრუნდა ბიუჯეტში${calendar ? ` · კვირა ${calendar.weekNo} · დღე ${calendar.dayNo}` : ''}`,
  });
  revalidatePath('/playmanager');
  return { success: true, message: `ფეხბურთელი გაყიდულია · XP +${xpReward}`, amount: data?.amount ?? 0 };
}

// ── Transfer market: manager-to-manager listings ─────────────────────────────

export async function listPlayManagerPlayer(
  playerId: string,
  askingPrice: number,
): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const price = Math.floor(Number(askingPrice));
  if (!Number.isFinite(price) || price <= 0) {
    return { success: false, error: 'invalid_player', message: 'ფასი არასწორია' };
  }

  const db = createSupabaseAdminClient();
  const { error } = await db.rpc('pm_list_player', {
    p_team_id: team.id,
    p_player_id: playerId,
    p_price: price,
  });

  if (error) {
    if (error.message.includes('already_listed')) {
      return { success: false, error: 'player_owned', message: 'ფეხბურთელი უკვე გაყიდვაშია' };
    }
    if (error.message.includes('not_owner')) {
      return { success: false, error: 'invalid_player', message: 'ფეხბურთელი შენი არ არის' };
    }
    return mapPlayerActionError(error.message);
  }

  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'gold',
    title: 'ფეხბურთელი გაყიდვაში გამოვიდა',
    detail: `მოთხოვნილი ფასი ${price.toLocaleString('ka-GE')} ₾`,
    href: `/playmanager/players/${playerId}`,
  });
  revalidatePath('/playmanager');
  return { success: true, message: `გამოტანილია სატრანსფერო ბაზარზე · ${price.toLocaleString('ka-GE')} ₾` };
}

export async function unlistPlayManagerPlayer(
  listingId: string,
): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { error } = await db.rpc('pm_unlist_player', {
    p_team_id: team.id,
    p_listing_id: listingId,
  });

  if (error) return mapPlayerActionError(error.message);
  revalidatePath('/playmanager');
  return { success: true, message: 'გაყიდვა გაუქმდა' };
}

export async function buyPlayManagerListedPlayer(
  listingId: string,
): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc('pm_buy_listed_player', {
    p_buyer_team_id: team.id,
    p_listing_id: listingId,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { price: number; playerId?: string } | null;

  if (error) {
    if (error.message.includes('own_listing')) {
      return { success: false, error: 'invalid_player', message: 'საკუთარ ფეხბურთელს ვერ იყიდი' };
    }
    if (error.message.includes('listing_unavailable')) {
      return { success: false, error: 'player_unavailable', message: 'ეს ფეხბურთელი აღარ იყიდება' };
    }
    return mapPlayerActionError(error.message);
  }

  const price = data?.price ?? 0;
  const xpReward = 18;
  await applyPostActionRewards({ userId: user.id, teamId: team.id, xpReward });
  const calendar = await advancePlayManagerTime(team.id, 1);
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'gold',
    title: 'ფეხბურთელი შეძენილია სატრანსფერო ბაზრიდან',
    detail: `${price.toLocaleString('ka-GE')} ₾ deal${calendar ? ` · კვირა ${calendar.weekNo} · დღე ${calendar.dayNo}` : ''}`,
    href: data?.playerId ? `/playmanager/players/${data.playerId}` : undefined,
  });
  revalidatePath('/playmanager');
  return { success: true, message: `ფეხბურთელი დაემატა გუნდს · XP +${xpReward}`, amount: -price };
}

// ── Transfer NEGOTIATION: manager↔manager offers on a listing ────────────────

function mapTransferOfferError(message: string): PlayManagerPlayerActionResult {
  if (message.includes('price_below_floor')) {
    return { success: false, error: 'unavailable', message: 'ფასი ძალიან დაბალია — მინიმუმ ღირებულების 50%-ია.' };
  }
  if (message.includes('pair_transfer_cap')) {
    return { success: false, error: 'unavailable', message: 'ამ კლუბთან სეზონის ტრანსფერების ლიმიტი ამოიწურა (მაქს. 2).' };
  }
  if (message.includes('offer_exists')) {
    return { success: false, error: 'unavailable', message: 'ამ ფეხბურთელზე უკვე გაქვს გახსნილი შეთავაზება.' };
  }
  if (message.includes('own_listing')) {
    return { success: false, error: 'invalid_player', message: 'საკუთარ ფეხბურთელს ვერ შესთავაზებ.' };
  }
  if (message.includes('listing_unavailable')) {
    return { success: false, error: 'player_unavailable', message: 'ეს ფეხბურთელი აღარ იყიდება.' };
  }
  if (message.includes('offer_unavailable')) {
    return { success: false, error: 'unavailable', message: 'შეთავაზება აღარ არის აქტიური.' };
  }
  if (message.includes('not_your_turn')) {
    return { success: false, error: 'unavailable', message: 'ახლა მეორე მხარის სვლაა.' };
  }
  if (message.includes('not_participant')) {
    return { success: false, error: 'unavailable', message: 'ეს შეთავაზება შენი არ არის.' };
  }
  return mapPlayerActionError(message);
}

// Buyer opens a negotiation on a listing with a proposed price.
export async function makePlayManagerTransferOffer(
  listingId: string,
  amount: number,
): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const price = Math.floor(Number(amount));
  if (!Number.isFinite(price) || price <= 0) {
    return { success: false, error: 'invalid_player', message: 'ფასი არასწორია' };
  }

  const db = createSupabaseAdminClient();
  const { error } = await db.rpc('pm_make_transfer_offer', {
    p_from_team_id: team.id,
    p_listing_id: listingId,
    p_amount: price,
  });
  if (error) return mapTransferOfferError(error.message);

  // Notify the seller (event feed on their team).
  const { data: listing } = await db
    .from('pm_transfer_listings')
    .select('seller_team_id, player:pm_players(display_name)')
    .eq('id', listingId)
    .maybeSingle();
  if (listing?.seller_team_id) {
    const player = Array.isArray(listing.player) ? listing.player[0] : listing.player;
    await logPlayManagerEvent({
      teamId: listing.seller_team_id,
      category: 'finance',
      accent: 'gold',
      title: 'ახალი სატრანსფერო შეთავაზება',
      detail: `${team.name} გთავაზობს ${price.toLocaleString('ka-GE')} ₾${player?.display_name ? ` · ${player.display_name}` : ''}`,
      href: '/playmanager/market?module=transfer_market&offers=1',
    });
  }
  revalidatePath('/playmanager');
  return { success: true, message: `შეთავაზება გაიგზავნა · ${price.toLocaleString('ka-GE')} ₾` };
}

// The awaited party accepts / rejects / counters. On accept the transfer settles.
export async function respondPlayManagerTransferOffer(
  offerId: string,
  action: 'accept' | 'reject' | 'counter',
  counterAmount?: number,
): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  let counter: number | null = null;
  if (action === 'counter') {
    counter = Math.floor(Number(counterAmount));
    if (!Number.isFinite(counter) || counter <= 0) {
      return { success: false, error: 'invalid_player', message: 'საპასუხო ფასი არასწორია' };
    }
  }

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc(
    'pm_respond_transfer_offer',
    { p_team_id: team.id, p_offer_id: offerId, p_action: action, p_counter_amount: counter ?? undefined },
  );
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { action: string; playerName?: string; price?: number; sellerTeamId?: string; buyerTeamId?: string; awaiting?: string } | null;
  if (error) return mapTransferOfferError(error.message);

  // Notify the counterpart. Fetch the offer to know both sides.
  const { data: offer } = await db
    .from('pm_transfer_offers')
    .select('from_team_id, to_team_id, amount_gel, player:pm_players(display_name)')
    .eq('id', offerId)
    .maybeSingle();
  const counterpartId = offer ? (offer.from_team_id === team.id ? offer.to_team_id : offer.from_team_id) : null;
  const playerRow = offer ? (Array.isArray(offer.player) ? offer.player[0] : offer.player) : null;
  const playerName = playerRow?.display_name ?? '';

  if (counterpartId) {
    if (action === 'accept') {
      const price = Number(data?.price ?? offer?.amount_gel ?? 0);
      // Buyer's side: notify both — buyer gains player, seller gets paid.
      await logPlayManagerEvent({
        teamId: counterpartId,
        category: 'finance',
        accent: 'gold',
        title: 'სატრანსფერო შეთავაზება მიღებულია',
        detail: `${playerName ? `${playerName} · ` : ''}${price.toLocaleString('ka-GE')} ₾`,
        href: '/playmanager/market?module=transfer_market&offers=1',
      });
    } else if (action === 'reject') {
      await logPlayManagerEvent({
        teamId: counterpartId,
        category: 'finance',
        accent: 'red',
        title: 'შეთავაზება უარყოფილია',
        detail: playerName || undefined,
        href: '/playmanager/market?module=transfer_market&offers=1',
      });
    } else {
      await logPlayManagerEvent({
        teamId: counterpartId,
        category: 'finance',
        accent: 'gold',
        title: 'საპასუხო ფასი მიიღე',
        detail: `${playerName ? `${playerName} · ` : ''}${(counter ?? 0).toLocaleString('ka-GE')} ₾`,
        href: '/playmanager/market?module=transfer_market&offers=1',
      });
    }
  }

  revalidatePath('/playmanager');
  const label = action === 'accept' ? 'გარიგება დაიხურა' : action === 'reject' ? 'შეთავაზება უარყოფილია' : `საპასუხო ფასი გაიგზავნა · ${(counter ?? 0).toLocaleString('ka-GE')} ₾`;
  return { success: true, message: label };
}

// Either participant withdraws a pending negotiation.
export async function cancelPlayManagerTransferOffer(
  offerId: string,
): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { error } = await db.rpc('pm_cancel_transfer_offer', {
    p_team_id: team.id,
    p_offer_id: offerId,
  });
  if (error) return mapTransferOfferError(error.message);
  revalidatePath('/playmanager');
  return { success: true, message: 'შეთავაზება გაუქმდა' };
}

export async function hirePlayManagerStaff(roleKey: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };
  if (!(roleKey in STAFF_ROLE_MAP)) {
    return { success: false, error: 'invalid_player', message: 'პერსონალის როლი ვერ მოიძებნა' };
  }

  const db = createSupabaseAdminClient();
  const typedRoleKey = roleKey as StaffRoleKey;
  // pm_hire_staff is a real Postgres TABLE-returning function, so the generated
  // client already infers { level, role_key }[] precisely — no cast needed.
  const { data, error } = await db.rpc('pm_hire_staff', {
    p_team_id: team.id,
    p_role_key: typedRoleKey,
  });

  if (error) {
    if (error.message.includes('staff_already_hired')) {
      return { success: false, error: 'player_owned', message: 'ეს პერსონალი უკვე დაქირავებულია' };
    }
    return mapPlayerActionError(error.message);
  }

  const row = Array.isArray(data) ? data[0] : null;
  const role = STAFF_ROLE_MAP[typedRoleKey];
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'board',
    accent: 'green',
    title: `${role.name} დაემატა შტაბს`,
    detail: `Level ${row?.level ?? 1}`,
  });
  revalidatePath('/playmanager');
  revalidatePath('/playmanager/residence');
  return { success: true, message: `${role.name} დაქირავებულია` };
}

export async function upgradePlayManagerStaff(roleKey: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };
  if (!(roleKey in STAFF_ROLE_MAP)) {
    return { success: false, error: 'invalid_player', message: 'პერსონალის როლი ვერ მოიძებნა' };
  }

  const db = createSupabaseAdminClient();
  const typedRoleKey = roleKey as StaffRoleKey;
  // Same TABLE-returning shape as pm_hire_staff — inferred, no cast needed.
  const { data, error } = await db.rpc('pm_upgrade_staff', {
    p_team_id: team.id,
    p_role_key: typedRoleKey,
  });

  if (error) {
    if (error.message.includes('division_level_lock')) {
      return { success: false, error: 'unavailable', message: 'ამ upgrade-ის გასახსნელად უფრო მაღალი დივიზიონია საჭირო' };
    }
    if (error.message.includes('staff_not_found')) {
      return { success: false, error: 'player_unavailable', message: 'ეს პერსონალი ჯერ დაქირავებული არ არის' };
    }
    if (error.message.includes('staff_max_level')) {
      return { success: false, error: 'unavailable', message: 'პერსონალი უკვე მაქსიმალურ დონეზეა' };
    }
    return mapPlayerActionError(error.message);
  }

  const row = Array.isArray(data) ? data[0] : null;
  const role = STAFF_ROLE_MAP[typedRoleKey];
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'board',
    accent: 'gold',
    title: `${role.name} განახლდა`,
    detail: `Level ${row?.level ?? 1}`,
  });
  revalidatePath('/playmanager');
  revalidatePath('/playmanager/residence');
  return { success: true, message: `${role.name} ახლა Level ${row?.level ?? 1}-ზეა` };
}

export async function savePlayManagerLineup(playerIds: string[]): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };
  if (playerIds.length === 0) return { success: false, error: 'invalid_player' };

  const db = createSupabaseAdminClient();
  const { error } = await db.rpc('pm_save_lineup_order', {
    p_team_id: team.id,
    p_lineup: playerIds,
  });

  if (error) return mapPlayerActionError(error.message);
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'board',
    accent: 'green',
    title: 'სასტარტო შემადგენლობა შეიცვალა',
    detail: `${playerIds.length} მოთამაშე შენახულ ტაქტიკაში`,
  });
  revalidatePath('/playmanager');
  return { success: true, message: 'სასტარტო შემადგენლობა შენახულია' };
}

export async function claimPlayManagerDailyReward(): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc('pm_claim_daily_reward', {
    p_team_id: team.id,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { streak: number; reward: number } | null;

  if (error) {
    if (error.message.includes('already_claimed')) return { success: false, error: 'unavailable' };
    return mapPlayerActionError(error.message);
  }
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'gold',
    title: `დღიური ჯილდო · სერია ${data?.streak ?? 1}`,
    detail: `+${(data?.reward ?? 0).toLocaleString('ka-GE')} ₾`,
  });
  revalidatePath('/playmanager');
  return { success: true, message: `+${(data?.reward ?? 0).toLocaleString('ka-GE')} ₾ · სერია ${data?.streak ?? 1}` };
}

export async function renewPlayManagerCareer(playerId: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc('pm_career_renew', {
    p_team_id: team.id,
    p_player_id: playerId,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { careerEndAge: number; cost: number } | null;

  if (error) {
    if (error.message.includes('not_in_career_window')) return { success: false, error: 'unavailable' };
    return mapPlayerActionError(error.message);
  }
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'gold',
    title: 'კარიერა გაგრძელდა',
    detail: `კარიერის ბოლო ${data?.careerEndAge ?? ''} წელი · -${(data?.cost ?? 0).toLocaleString('ka-GE')} ₾`,
  });
  revalidatePath(`/playmanager/players/${playerId}`);
  return { success: true, message: `კარიერა გაგრძელდა · -${(data?.cost ?? 0).toLocaleString('ka-GE')} ₾` };
}

export async function releasePlayManagerCareer(playerId: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc('pm_career_release', {
    p_team_id: team.id,
    p_player_id: playerId,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { comp: number; destination: string } | null;

  if (error) {
    if (error.message.includes('not_in_career_window')) return { success: false, error: 'unavailable' };
    return mapPlayerActionError(error.message);
  }
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'board',
    accent: 'green',
    title: 'მოთამაშეს დაემშვიდობეთ',
    detail: `+${(data?.comp ?? 0).toLocaleString('ka-GE')} ₾ კომპენსაცია`,
  });
  revalidatePath(`/playmanager/players/${playerId}`);
  return { success: true, message: `დამშვიდობება · +${(data?.comp ?? 0).toLocaleString('ka-GE')} ₾` };
}

export async function savePlayManagerLineupFormation(
  formation: string,
  slots: { playerId: string; slot: string | null }[],
): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };
  if (slots.length === 0) return { success: false, error: 'invalid_player' };

  const db = createSupabaseAdminClient();
  const { error } = await db.rpc('pm_save_lineup_formation', {
    p_team_id: team.id,
    p_formation: formation,
    p_slots: slots,
  });

  if (error) return mapPlayerActionError(error.message);
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'board',
    accent: 'green',
    title: 'სასტარტო შემადგენლობა და ფორმაცია შეიცვალა',
    detail: `${formation} · ${slots.length} მოთამაშე`,
  });
  revalidatePath('/playmanager');
  return { success: true, message: 'შემადგენლობა და ფორმაცია შენახულია' };
}

export async function savePlayManagerMatchSettings(input: {
  tacticalStyle: 'balanced' | 'pressing' | 'possession' | 'counter';
  defensiveLine: 'low' | 'mid' | 'high';
  tempo: 'controlled' | 'balanced' | 'direct';
  focusSide: 'left' | 'center' | 'right';
}): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { error } = await db.rpc('pm_save_match_settings', {
    p_team_id: team.id,
    p_tactical_style: input.tacticalStyle,
    p_defensive_line: input.defensiveLine,
    p_tempo: input.tempo,
    p_focus_side: input.focusSide,
  });

  if (error) return mapPlayerActionError(error.message);
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'board',
    accent: 'green',
    title: 'Matchday ტაქტიკა განახლდა',
    detail: `${input.tacticalStyle} · ${input.defensiveLine} line · ${input.tempo} · ${input.focusSide}`,
  });
  revalidatePath('/playmanager');
  return { success: true, message: 'Matchday ტაქტიკა შენახულია' };
}

export async function savePlayManagerTicketPrice(ticketPrice: number): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  // Validate at the boundary: clamp to the allowed range so a crafted request
  // can never send an out-of-range value to the RPC. (DB also enforces 10–80.)
  const safeTicketPrice = clampTicketPriceGel(ticketPrice);

  const db = createSupabaseAdminClient();
  const { error } = await db.rpc('pm_save_ticket_price', {
    p_team_id: team.id,
    p_ticket_price: safeTicketPrice,
  });

  if (error) return mapPlayerActionError(error.message);
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'gold',
    title: 'ბილეთის ფასი განახლდა',
    detail: `${safeTicketPrice.toLocaleString('ka-GE')} ₾`,
  });
  revalidatePath('/playmanager');
  return { success: true, message: 'ბილეთის ფასი შენახულია' };
}

export async function negotiatePlayManagerSponsor(): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc('pm_negotiate_sponsor', {
    p_team_id: team.id,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { sponsorTier: string; sponsorWeeklyAmount: number } | null;

  if (error) return mapPlayerActionError(error.message);
  const calendar = await advancePlayManagerTime(team.id, 1);
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'green',
    title: `ახალი სპონსორი · ${data?.sponsorTier ?? 'local'}`,
    detail: `${(data?.sponsorWeeklyAmount ?? 0).toLocaleString('ka-GE')} ₾ weekly${calendar ? ` · კვირა ${calendar.weekNo} · დღე ${calendar.dayNo}` : ''}`,
  });
  revalidatePath('/playmanager');
  return {
    success: true,
    message: `სპონსორი განახლდა · ${(data?.sponsorWeeklyAmount ?? 0).toLocaleString('ka-GE')} ₾ weekly`,
  };
}

export async function buyPlayManagerXpPack(pack: 'starter' | 'prep' | 'elite'): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc('pm_buy_xp_pack', {
    p_team_id: team.id,
    p_pack: pack,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { xp: number; price: number; newXp: number } | null;

  if (error) {
    if (error.message.includes('invalid_pack')) return { success: false, error: 'unavailable' };
    return mapPlayerActionError(error.message);
  }
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'gold',
    title: `XP პაკეტი შეძენილია · +${(data?.xp ?? 0).toLocaleString('ka-GE')} XP`,
    detail: `-${(data?.price ?? 0).toLocaleString('ka-GE')} ₾`,
  });
  revalidatePath('/playmanager/training');
  revalidatePath('/playmanager');
  return {
    success: true,
    message: `+${(data?.xp ?? 0).toLocaleString('ka-GE')} XP`,
    amount: data?.price ?? 0,
  };
}

function mapPlayerActionError(message: string): PlayManagerPlayerActionResult {
  if (message.includes('insufficient_funds')) return { success: false, error: 'insufficient_funds' };
  if (message.includes('already_trained_this_match') || message.includes('training_quota_reached')) {
    return { success: false, error: 'unavailable', message: 'ეს ფეხბურთელი ამ მატჩზე უკვე ივარჯიშა — შემდეგი სესია მატჩის შემდეგ.' };
  }
  if (message.includes('player_maxed')) {
    return { success: false, error: 'unavailable', message: 'ფეხბურთელმა პოტენციალის ჭერს მიაღწია.' };
  }
  if (message.includes('player_unavailable') || message.includes('player_not_found')) {
    return { success: false, error: 'player_unavailable' };
  }
  if (message.includes('duplicate_player')) return { success: false, error: 'invalid_player' };
  if (message.includes('player_owned')) return { success: false, error: 'player_owned' };
  if (message.includes('insufficient_fodder')) return { success: false, error: 'insufficient_fodder' };
  if (message.includes('no_upgrade_available') || message.includes('no_pending_development')) {
    return { success: false, error: 'no_upgrade_available' };
  }
  if (message.includes('invalid_ticket_price') || message.includes('invalid_lineup')) {
    return { success: false, error: 'invalid_player' };
  }
  if (message.includes('invalid')) return { success: false, error: 'invalid_player' };
  return { success: false, error: 'unavailable' };
}

export async function joinCupAction(cupInstanceId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const { joinPlayManagerCup } = await import('@/lib/playmanager/cups');
  const result = await joinPlayManagerCup(team.id, cupInstanceId);
  
  if (!result.success) {
    if (result.error === 'cup_full') return { success: false, error: 'თასზე ადგილები აღარ არის' };
    if (result.error === 'insufficient_funds') return { success: false, error: 'არ გაქვთ საკმარისი თანხა' };
    if (result.error === 'already_registered') return { success: false, error: 'უკვე დარეგისტრირებული ხართ ამ თასზე' };
    return { success: false, error: 'შეცდომა რეგისტრაციისას' };
  }

  revalidatePath('/playmanager/league');
  return { success: true, message: 'წარმატებით დარეგისტრირდით თასზე' };
}

// ── Real-manager leagues (championships) ─────────────────────────────────────

export async function createPlayManagerLeague(input: {
  name: string;
  divisionLevel: number;
  maxTeams: number;
  prizePool: number;
  format?: 'round_robin' | 'knockout';
}): Promise<{ success: boolean; error?: string; leagueId?: string }> {
  if (!(await hasPermission('manage_content'))) return { success: false, error: 'forbidden' };
  const name = input.name?.trim();
  if (!name) return { success: false, error: 'invalid_name' };
  const divisionLevel = Math.max(1, Math.min(4, Math.trunc(input.divisionLevel || 4)));
  const maxTeams = Math.max(2, Math.min(20, Math.trunc(input.maxTeams || 8)));
  const prizePool = Math.max(0, Math.trunc(input.prizePool || 0));
  const format = input.format === 'knockout' ? 'knockout' : 'round_robin';

  const result = await createLeague({ name, divisionLevel, maxTeams, prizePool, format });
  if (!result.success) return { success: false, error: result.error };
  revalidatePath('/playmanager/championships');
  return { success: true, leagueId: result.leagueId };
}

export async function joinPlayManagerLeague(leagueId: string): Promise<{ success: boolean; error?: string }> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const result = await joinLeague(team.id, leagueId);
  if (!result.success) return { success: false, error: result.error };
  revalidatePath('/playmanager/championships');
  return { success: true };
}

export async function startPlayManagerLeague(leagueId: string): Promise<{ success: boolean; error?: string }> {
  if (!(await hasPermission('manage_content'))) return { success: false, error: 'forbidden' };
  const result = await startLeague(leagueId);
  if (!result.success) return { success: false, error: result.error };
  revalidatePath('/playmanager/championships');
  return { success: true };
}

// Play the team's next ready REAL fixture (cup/championship) now — the unified
// "main match" that replaces the old fake-opponent league round.
export async function playPlayManagerNextFixture(): Promise<
  { success: true; fixture: PlayedFixture | null } | { success: false; error: string }
> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const fixture = await playNextFixtureForTeam(team.id);
  revalidatePath('/playmanager');
  revalidatePath('/playmanager/arena');
  return { success: true, fixture };
}

