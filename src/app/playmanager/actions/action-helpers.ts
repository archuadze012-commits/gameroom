// Shared plumbing for the split playmanager action modules — auth lookup, the
// club-effects bonus context, reward/time-advance side jobs, and event logging.
// Not a 'use server' file: nothing here is called directly from a client
// component, only re-used by the sibling '*-actions.ts' Server Action files.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TeamFacilityState } from '@/lib/playmanager/facilities';
import { getCombinedClubEffects, getManagerProgression } from '@/lib/playmanager/progression';
import { getTeam } from '@/lib/playmanager/team';
import { createLogger } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';

// Economy/world-tick failures are alertable: a lost XP/credit award or a
// dropped lifecycle job is real value the player earned quietly vanishing, so
// these use log.critical (forwards to ALERT_WEBHOOK_URL when configured).
const log = createLogger('playmanager');

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

export function getPercentBonusAmount(amount: number, pct: number) {
  if (amount <= 0 || pct <= 0) return 0;
  return Math.round(amount * (pct / 100));
}

export function getXpRewardWithTrainingBonus(baseXp: number, trainingBonusPct: number, trainingAffected: boolean) {
  if (baseXp <= 0) return 0;
  if (!trainingAffected || trainingBonusPct <= 0) return baseXp;
  return baseXp + Math.round(baseXp * (trainingBonusPct / 100));
}

export async function getActionContext(userId: string, teamId: string): Promise<ActionContext> {
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

export async function applyPostActionRewards(input: {
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
      log.critical(`reward job "${label}" threw`, { teamId: input.teamId, error: result.reason });
    } else if (result.value?.error) {
      log.critical(`reward job "${label}" failed`, { teamId: input.teamId, error: result.value.error.message });
    }
  });
}

export async function advancePlayManagerTime(teamId: string, days = 1) {
  const db = createSupabaseAdminClient();
  const { data: rawData, error: advanceError } = await db.rpc('pm_advance_time', {
    p_team_id: teamId,
    p_days: days,
  });
  if (advanceError) {
    log.critical('pm_advance_time failed', { teamId, error: advanceError.message });
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
      log.critical(`time-advance job "${jobs[i].label}" threw`, { teamId, error: result.reason });
    } else if (result.value?.error) {
      log.critical(`time-advance job "${jobs[i].label}" failed`, { teamId, error: result.value.error.message });
    }
  });
  return data ?? null;
}

export async function logPlayManagerEvent(input: {
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

export async function getAuthenticatedTeam() {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { user: null, team: null };
  return { user, team: await getTeam(user.id) };
}

export function mapPlayerActionError(message: string): PlayManagerPlayerActionResult {
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

// App-level spam/retry guard for mutating actions. DB constraints already keep
// state valid; this blunts rapid spam-click / double-submit bursts that would
// otherwise hammer the RPCs. Per-user, per-bucket, generous window — tuned to
// catch automated/retry storms, not normal play. In-memory & per-instance (see
// rate-limit.ts); back with Redis for multi-instance hardening.
export function playManagerActionLimited(userId: string, bucket: string, limit = 12, windowMs = 10_000): boolean {
  return !rateLimit(`pm:${bucket}:${userId}`, limit, windowMs);
}

// The standard PlayManagerPlayerActionResult returned when a spam guard trips.
export const RATE_LIMITED_RESULT: PlayManagerPlayerActionResult = {
  success: false,
  error: 'unavailable',
  message: 'ძალიან სწრაფად — სცადე რამდენიმე წამში.',
};
