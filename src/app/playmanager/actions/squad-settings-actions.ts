'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  getAuthenticatedTeam,
  logPlayManagerEvent,
  mapPlayerActionError,
  type PlayManagerPlayerActionResult,
} from './action-helpers';

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

export async function swapPlayManagerSquadPlayers(
  activeId: number,
  unassignedId: number,
): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { error } = await db.rpc('pm_swap_squad_players', {
    p_team_id: team.id,
    p_active_id: activeId,
    p_unassigned_id: unassignedId,
  });

  if (error) return mapPlayerActionError(error.message);

  await logPlayManagerEvent({
    teamId: team.id,
    category: 'board',
    accent: 'green',
    title: 'შემადგენლობის როტაცია',
    detail: 'მოთამაშე დროებითი განთავსებიდან დაემატა აქტიურ შემადგენლობაში',
  });

  revalidatePath('/playmanager');
  return { success: true, message: 'მოთამაშეები წარმატებით გაცვალეს' };
}
