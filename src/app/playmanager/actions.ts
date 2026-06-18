'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { asPlayManagerDb } from '@/lib/playmanager/db';
import { clampTicketPriceGel, getCurrentTransferValueGel } from '@/lib/playmanager/economy';
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
  | { success: true; message: string; amount?: number }
  | {
      success: false;
      error:
        | 'unauthenticated'
        | 'team_missing'
        | 'invalid_player'
        | 'insufficient_funds'
        | 'player_unavailable'
        | 'player_owned'
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
  staffTrainingBonusPct?: number;
  positionCoachApplied?: boolean;
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
  const db = asPlayManagerDb(createSupabaseAdminClient());
  const [{ data: profile }, { data: facilityRows }] = await Promise.all([
    db.from<{ xp: number | null }>('profiles').select('xp').eq('id', userId).single(),
    db.from<{ sprite_key: TeamFacilityState['spriteKey']; level: number; progress: number; status: TeamFacilityState['status'] }>('pm_facilities')
      .select('sprite_key, level, progress, status')
      .eq('team_id', teamId),
  ]);

  const facilities: TeamFacilityState[] = (facilityRows ?? []).map((row) => ({
    spriteKey: row.sprite_key,
    level: row.level,
    progress: row.progress,
    status: row.status,
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
  const db = asPlayManagerDb(createSupabaseAdminClient());
  const jobs: { label: string; run: Promise<{ error: { message: string } | null }> }[] = [];
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
  const db = asPlayManagerDb(createSupabaseAdminClient());
  const { data } = await db.rpc<CalendarAdvance>('pm_advance_time', {
    p_team_id: teamId,
    p_days: days,
  });
  return data ?? null;
}

async function logPlayManagerEvent(input: {
  teamId: string;
  category: 'match' | 'medical' | 'finance' | 'academy' | 'media' | 'board' | 'system';
  accent: 'green' | 'red' | 'gold';
  title: string;
  detail?: string | null;
}) {
  const db = asPlayManagerDb(createSupabaseAdminClient());
  await db.rpc('pm_log_event', {
    p_team_id: input.teamId,
    p_category: input.category,
    p_title: input.title,
    p_detail: input.detail ?? null,
    p_accent: input.accent,
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

  const db = asPlayManagerDb(createSupabaseAdminClient());
  const actionContext = await getActionContext(user.id, team.id);

  // One atomic RPC: core action + (optional) league sim + XP + bonus credit + time
  // advance, all in a single transaction. The bonus engine stays in TS — only the
  // resulting percentages cross into SQL, where they are applied as plain arithmetic.
  const { data, error } = await db.rpc<RpcCityActionFull>('pm_run_city_action_full', {
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

  if (error || !data) {
    const message = error?.message ?? 'unavailable';
    if (message.includes('insufficient_funds')) return { success: false, error: 'insufficient_funds' };
    if (message.includes('facility_locked')) return { success: false, error: 'facility_locked' };
    if (message.includes('already_done_today')) return { success: false, error: 'already_done_today' };
    if (message.includes('invalid_facility')) return { success: false, error: 'invalid_facility' };
    return { success: false, error: 'unavailable' };
  }

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

  const target = MARKET_TARGETS.find((player) => player.key === playerKey || player.normalizedName === playerKey);
  if (!target) return { success: false, error: 'invalid_player' };

  const price = getCurrentTransferValueGel(target.ovr, target.ovr);
  const db = asPlayManagerDb(createSupabaseAdminClient());
  const actionContext = await getActionContext(user.id, team.id);
  const { error } = await db.rpc('pm_buy_market_player', {
    p_team_id: team.id,
    p_player: {
      normalized_name: target.normalizedName,
      display_name: target.displayName,
      position: target.position,
      is_real: true,
      talent: 10,
      ea_fc_ovr: target.ovr,
      ovr_source: 'ea_fc',
      ovr_base: target.ovr,
      ovr_current: target.ovr,
      age: target.age,
      current_transfer_value_gel: price,
    },
  });

  if (error) return mapPlayerActionError(error.message);
  const refund = getPercentBonusAmount(price, actionContext.bonuses.transferDiscountPct);
  const xpReward = 18;
  await applyPostActionRewards({
    userId: user.id,
    teamId: team.id,
    xpReward,
    extraCredit: refund,
    creditReason: `market_discount:${target.normalizedName}`,
  });
  const calendar = await advancePlayManagerTime(team.id, 1);
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'gold',
    title: `${target.displayName} დაემატა გუნდს`,
    detail: `${price.toLocaleString('ka-GE')} ₾ deal${refund > 0 ? ` · refund ${refund.toLocaleString('ka-GE')} ₾` : ''}${calendar ? ` · კვირა ${calendar.weekNo} · დღე ${calendar.dayNo}` : ''}`,
  });
  revalidatePath('/playmanager');
  return {
    success: true,
    message: `${target.displayName} დაემატა გუნდს${refund > 0 ? ` · discount refund ${refund.toLocaleString('ka-GE')} ₾` : ''} · XP +${xpReward}`,
    amount: -(price - refund),
  };
}

export async function trainPlayManagerPlayer(playerId: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = asPlayManagerDb(createSupabaseAdminClient());
  const actionContext = await getActionContext(user.id, team.id);
  const { data, error } = await db.rpc<TrainPlayerRpcResult>('pm_train_player', {
    p_team_id: team.id,
    p_player_id: playerId,
  });

  if (error) return mapPlayerActionError(error.message);
  const xpReward = getXpRewardWithTrainingBonus(18, actionContext.bonuses.trainingXpPct, true);
  await applyPostActionRewards({
    userId: user.id,
    teamId: team.id,
    xpReward,
  });
  const calendar = await advancePlayManagerTime(team.id, 1);
  const ovrGain = Math.max(1, data?.ovrGain ?? 1);
  const trainingBonusPct = Math.max(0, data?.staffTrainingBonusPct ?? 0);
  const coachDetail = data?.positionCoachApplied
    ? ` · positional coach proc +${trainingBonusPct}%`
    : trainingBonusPct > 0
      ? ` · coach bonus ${trainingBonusPct}%`
      : '';
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'board',
    accent: 'green',
    title: 'ინდივიდუალური ვარჯიში დასრულდა',
    detail: `OVR +${ovrGain} · XP +${xpReward}${coachDetail}${calendar ? ` · კვირა ${calendar.weekNo} · დღე ${calendar.dayNo}` : ''}`,
  });
  revalidatePath('/playmanager');
  return {
    success: true,
    message: `OVR გაიზარდა +${ovrGain}-ით · XP +${xpReward}${data?.positionCoachApplied ? ' · positional coach hit' : ''}`,
  };
}

export async function signPlayManagerAcademyProspect(prospectId: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = asPlayManagerDb(createSupabaseAdminClient());
  const actionContext = await getActionContext(user.id, team.id);
  const { data, error } = await db.rpc<{ cost: number }>('pm_sign_academy_prospect', {
    p_team_id: team.id,
    p_prospect_id: prospectId,
  });

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

  const db = asPlayManagerDb(createSupabaseAdminClient());
  const { data, error } = await db.rpc<{ amount: number }>('pm_sell_player', {
    p_team_id: team.id,
    p_player_id: playerId,
  });

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

type StaffMutationRow = {
  role_key: StaffRoleKey;
  level: number;
};

export async function hirePlayManagerStaff(roleKey: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };
  if (!(roleKey in STAFF_ROLE_MAP)) {
    return { success: false, error: 'invalid_player', message: 'პერსონალის როლი ვერ მოიძებნა' };
  }

  const db = asPlayManagerDb(createSupabaseAdminClient());
  const typedRoleKey = roleKey as StaffRoleKey;
  const { data, error } = await db.rpc<StaffMutationRow[]>('pm_hire_staff', {
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

  const db = asPlayManagerDb(createSupabaseAdminClient());
  const typedRoleKey = roleKey as StaffRoleKey;
  const { data, error } = await db.rpc<StaffMutationRow[]>('pm_upgrade_staff', {
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

  const db = asPlayManagerDb(createSupabaseAdminClient());
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

export async function togglePlayManagerMarketShortlist(playerKey: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };
  if (!playerKey) return { success: false, error: 'invalid_player' };

  const db = asPlayManagerDb(createSupabaseAdminClient());
  const { data, error } = await db.rpc<{ shortlisted: boolean }>('pm_toggle_market_shortlist', {
    p_team_id: team.id,
    p_player_key: playerKey,
  });

  if (error) return mapPlayerActionError(error.message);
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'board',
    accent: data?.shortlisted ? 'gold' : 'red',
    title: data?.shortlisted ? 'ფეხბურთელი shortlist-ში დაემატა' : 'ფეხბურთელი shortlist-დან ამოიშალა',
    detail: playerKey,
  });
  revalidatePath('/playmanager');
  return { success: true, message: data?.shortlisted ? 'ფეხბურთელი shortlist-ში დაემატა' : 'ფეხბურთელი shortlist-დან წაიშალა' };
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

  const db = asPlayManagerDb(createSupabaseAdminClient());
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

  const db = asPlayManagerDb(createSupabaseAdminClient());
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

  const db = asPlayManagerDb(createSupabaseAdminClient());
  const { data, error } = await db.rpc<{ sponsorTier: string; sponsorWeeklyAmount: number }>('pm_negotiate_sponsor', {
    p_team_id: team.id,
  });

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

function mapPlayerActionError(message: string): PlayManagerPlayerActionResult {
  if (message.includes('insufficient_funds')) return { success: false, error: 'insufficient_funds' };
  if (message.includes('player_unavailable') || message.includes('player_not_found')) {
    return { success: false, error: 'player_unavailable' };
  }
  if (message.includes('duplicate_player')) return { success: false, error: 'invalid_player' };
  if (message.includes('player_owned')) return { success: false, error: 'player_owned' };
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

  // Need to import joinPlayManagerCup at top level or here
  const { joinPlayManagerCup } = await import('@/lib/playmanager/cups');
  const result = await joinPlayManagerCup(user.id, team.id, cupInstanceId);
  
  if (!result.success) {
    if (result.error === 'cup_full') return { success: false, error: 'თასზე ადგილები აღარ არის' };
    if (result.error === 'insufficient_funds') return { success: false, error: 'არ გაქვთ საკმარისი თანხა' };
    if (result.error === 'already_registered') return { success: false, error: 'უკვე დარეგისტრირებული ხართ ამ თასზე' };
    return { success: false, error: 'შეცდომა რეგისტრაციისას' };
  }

  revalidatePath('/playmanager/league');
  return { success: true, message: 'წარმატებით დარეგისტრირდით თასზე' };
}
