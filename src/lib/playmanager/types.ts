export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST';

export type PlayerStatus = 'active' | 'injured' | 'retired';

export interface PmPlayer {
  id: string;
  normalized_name: string;
  display_name: string;
  is_real: boolean;
  talent: number; // 1–10
  ea_fc_ovr: number | null;
  ovr_source: 'generated' | 'ea_fc';
  ovr_base: number;
  ovr_current: number;
  base_transfer_value_gel: number;
  current_transfer_value_gel: number;
  age: number;
  fatigue: number; // 0–100
  morale: number; // 0-100
  injury_matches: number;
  status: PlayerStatus;
  owner_id: string | null;
  created_at: string;
}

export interface PmTeam {
  id: string;
  user_id: string;
  name: string;
  division_id: number;
  created_at: string;
}

export interface PmWallet {
  team_id: string;
  balance: number;
}

export interface PmFacility {
  team_id: string;
  sprite_key: string;
  level: number;
  progress: number;
  status: 'active' | 'attention' | 'upgradeable' | 'locked' | 'completed';
  updated_at: string;
}

export interface PmSquadEntry {
  id: number;
  team_id: string;
  player_id: string;
  position: Position;
  shirt_number: number | null;
}

export interface PmMatchSettings {
  team_id: string;
  tactical_style: 'balanced' | 'pressing' | 'possession' | 'counter';
  defensive_line: 'low' | 'mid' | 'high';
  tempo: 'controlled' | 'balanced' | 'direct';
  focus_side: 'left' | 'center' | 'right';
  updated_at: string;
}

export interface PmFinanceState {
  team_id: string;
  ticket_price: number;
  sponsor_tier: 'local' | 'regional' | 'global';
  sponsor_weekly_amount: number;
  last_settled_week: number;
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
