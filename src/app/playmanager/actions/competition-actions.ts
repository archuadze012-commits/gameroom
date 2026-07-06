'use server';

import { revalidatePath } from 'next/cache';
import { hasPermission } from '@/lib/admin';
import { createLeague, joinLeague, startLeague } from '@/lib/playmanager/leagues';
import { playNextFixtureForTeam, type PlayedFixture } from '@/lib/playmanager/next-fixture';
import { getAuthenticatedTeam, playManagerActionLimited } from './action-helpers';

export async function joinCupAction(cupInstanceId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };
  if (await playManagerActionLimited(user.id, 'competition')) {
    return { success: false, error: 'ძალიან სწრაფად — სცადე რამდენიმე წამში' };
  }

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
  if (await playManagerActionLimited(user.id, 'competition')) return { success: false, error: 'rate_limited' };

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
  if (await playManagerActionLimited(user.id, 'competition')) return { success: false, error: 'rate_limited' };

  const fixture = await playNextFixtureForTeam(team.id);
  revalidatePath('/playmanager');
  revalidatePath('/playmanager/arena');
  return { success: true, fixture };
}
