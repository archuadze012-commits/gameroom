'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  isFacilityKey,
  type CityActionKey,
  type FacilityKey,
  type FacilityStatus,
} from '@/lib/playmanager/gameplay';
import { getActionRewardBonusPct, getCityActionXpReward } from '@/lib/playmanager/progression';
import { getTeam } from '@/lib/playmanager/team';
import { getActionContext, logPlayManagerEvent, playManagerActionLimited } from './action-helpers';

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
  if (playManagerActionLimited(user.id, 'city')) return { success: false, error: 'unavailable' };

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
