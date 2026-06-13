export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST';

export type PlayerStatus = 'active' | 'injured' | 'retired';

export interface PmPlayer {
  id: string;
  normalized_name: string;
  display_name: string;
  is_real: boolean;
  talent: number; // 1–10
  ovr_base: number;
  ovr_current: number;
  age: number;
  fatigue: number; // 0–100
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

export interface PmSquadEntry {
  id: number;
  team_id: string;
  player_id: string;
  position: Position;
  shirt_number: number | null;
}

export interface GeneratedPlayer {
  normalized_name: string;
  display_name: string;
  talent: number;
  ovr_base: number;
  age: number;
  position: Position;
}
