import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { asPlayManagerDb } from './db';
import type { FacilityKey, FacilityStatus } from './gameplay';
import type { PmFacility } from './types';

export type TeamFacilityState = {
  spriteKey: FacilityKey;
  level: number;
  progress: number;
  status: FacilityStatus;
};

export async function getTeamFacilities(teamId: string): Promise<TeamFacilityState[]> {
  const db = asPlayManagerDb(createSupabaseAdminClient());
  const ensure = await db.rpc('pm_ensure_facilities', { p_team_id: teamId });
  if (ensure.error) return [];

  const { data, error } = await db
    .from<PmFacility>('pm_facilities')
    .select('sprite_key, level, progress, status')
    .eq('team_id', teamId);
  if (error || !data) return [];

  return data.map((facility) => ({
    spriteKey: facility.sprite_key as FacilityKey,
    level: facility.level,
    progress: facility.progress,
    status: facility.status,
  }));
}
