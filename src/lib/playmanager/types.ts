export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST' | 'LM' | 'RM' | 'AM';

export interface PmTeam {
  id: string;
  user_id: string;
  name: string;
  division_id: number;
  created_at: string;
}

export interface PmFacility {
  team_id: string;
  sprite_key: string;
  level: number;
  progress: number;
  status: 'active' | 'attention' | 'upgradeable' | 'locked' | 'completed';
  updated_at: string;
}

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
