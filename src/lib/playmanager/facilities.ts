import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { FacilityKey, FacilityStatus } from './gameplay';

export type TeamFacilityState = {
  spriteKey: FacilityKey;
  level: number;
  progress: number;
  status: FacilityStatus;
};

export async function getTeamFacilities(teamId: string): Promise<TeamFacilityState[]> {
  const db = createSupabaseAdminClient();
  const ensure = await db.rpc('pm_ensure_facilities', { p_team_id: teamId });
  if (ensure.error) return [];

  const { data, error } = await db
    .from('pm_facilities')
    .select('sprite_key, level, progress, status')
    .eq('team_id', teamId);
  if (error || !data) return [];

  // status/sprite_key are DB CHECK-constrained but the generator only sees
  // `text` — narrowing to the app's own unions is legitimate here, not a gap.
  return data.map((facility) => ({
    spriteKey: facility.sprite_key as FacilityKey,
    level: facility.level,
    progress: facility.progress,
    status: facility.status as FacilityStatus,
  }));
}
