import type { Database } from '@/lib/database.types';

export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST' | 'LM' | 'RM' | 'AM';

// Sourced from the generated schema (single source of truth) instead of a
// hand-rolled interface that can silently drift from the real columns.
export type PmTeam = Database['public']['Tables']['pm_teams']['Row'];

export interface GeneratedPlayer {
  normalized_name: string;
  display_name: string;
  talent: number;
  is_real?: boolean;
  ea_fc_ovr?: number | null;
  ovr_source?: 'generated' | 'ea_fc';
  ovr_base: number;
  base_transfer_value_gel: number;
  current_transfer_value_gel: number;
  age: number;
  position: Position;
}
