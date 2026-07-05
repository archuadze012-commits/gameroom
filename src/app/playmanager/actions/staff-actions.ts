'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { STAFF_ROLE_MAP, type StaffRoleKey } from '@/lib/playmanager/staff';
import {
  getAuthenticatedTeam,
  playManagerActionLimited,
  RATE_LIMITED_RESULT,
  logPlayManagerEvent,
  mapPlayerActionError,
  type PlayManagerPlayerActionResult,
} from './action-helpers';

export async function hirePlayManagerStaff(roleKey: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };
  if (playManagerActionLimited(user.id, 'staff')) return RATE_LIMITED_RESULT;
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
  if (playManagerActionLimited(user.id, 'staff')) return RATE_LIMITED_RESULT;
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
