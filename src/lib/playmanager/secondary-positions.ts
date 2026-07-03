const SECONDARY_POSITION_MAP: Record<string, string[]> = {
  ST: ['LW', 'RW'],
  LW: ['RW', 'LM'],
  RW: ['LW', 'RM'],
  LM: ['LW', 'CM'],
  RM: ['RW', 'CM'],
  CAM: ['CM', 'ST'],
  AM: ['CAM', 'CM'],
  CM: ['CDM', 'CAM'],
  CDM: ['CM', 'CB'],
  CB: ['RB', 'LB'],
  LB: ['CB', 'LM'],
  RB: ['CB', 'RM'],
  GK: [],
};

export function normalizePlayManagerPosition(position: string | null | undefined): string {
  const normalized = position?.trim().toUpperCase() ?? '';
  if (normalized === 'CF') return 'ST';
  if (normalized === 'LCB' || normalized === 'RCB') return 'CB';
  if (normalized === 'LCM' || normalized === 'RCM') return 'CM';
  if (normalized === 'LWB') return 'LB';
  if (normalized === 'RWB') return 'RB';
  return normalized || 'CM';
}

export function getSuggestedSecondaryPositions(position: string | null | undefined): string[] {
  return SECONDARY_POSITION_MAP[normalizePlayManagerPosition(position)] ?? [];
}

export function getSecondaryPositionsPair(position: string | null | undefined): [string, string] {
  const positions = getSuggestedSecondaryPositions(position);
  return [positions[0] ?? '--', positions[1] ?? '--'];
}

// ── Canonical position → coach/line taxonomy ──────────────────────────────────
// Single source of truth for the TS side, kept byte-for-byte with the SQL
// taxonomy (20260628e_midfield_coach.sql header + pm_train_player, and the dev
// pipeline 20260628g): gk→GK, def→CB/LB/RB, mid→CDM/CM/CAM/AM/LM/RM,
// att→everything else (LW/RW/ST/CF…). This drives BOTH which coach trains a
// player AND the market GK/DEF/MID/ATT filter, so a player's "line" is identical
// across market, training and development.
const DEFENCE_POSITIONS = ['CB', 'LB', 'RB'];
const MIDFIELD_POSITIONS = ['CDM', 'CM', 'CAM', 'AM', 'LM', 'RM'];

// The one position-group classifier for the whole app. Everything that buckets a
// player into a "line" — the market GK/DEF/MID/ATT filter, which coach trains
// him, the scouting squad-balance report — derives from THIS function, so the
// taxonomy can never drift between features.
export type PositionFilterKey = 'GK' | 'DEF' | 'MID' | 'ATT';

export function getPositionGroup(position: string | null | undefined): PositionFilterKey {
  const pos = normalizePlayManagerPosition(position);
  if (pos === 'GK') return 'GK';
  if (DEFENCE_POSITIONS.includes(pos)) return 'DEF';
  if (MIDFIELD_POSITIONS.includes(pos)) return 'MID';
  return 'ATT'; // LW, RW, ST, CF and any unknown attacking role
}

export function positionMatchesFilter(position: string | null | undefined, filter: PositionFilterKey): boolean {
  return getPositionGroup(position) === filter;
}

// Coach roles map 1:1 onto the position groups. Kept identical to the SQL
// taxonomy in 20260628e_midfield_coach.sql / the dev pipeline (20260628g).
export type PositionCoachRoleKey = 'gk_coach' | 'defence_coach' | 'midfield_coach' | 'attack_coach';

const GROUP_TO_COACH: Record<PositionFilterKey, PositionCoachRoleKey> = {
  GK: 'gk_coach',
  DEF: 'defence_coach',
  MID: 'midfield_coach',
  ATT: 'attack_coach',
};

export function getCoachRoleForPosition(position: string | null | undefined): PositionCoachRoleKey {
  return GROUP_TO_COACH[getPositionGroup(position)];
}

export function isPositionCoachRole(roleKey: string): roleKey is PositionCoachRoleKey {
  return (
    roleKey === 'gk_coach' ||
    roleKey === 'defence_coach' ||
    roleKey === 'midfield_coach' ||
    roleKey === 'attack_coach'
  );
}

export function positionMatchesCoach(position: string | null | undefined, roleKey: string): boolean {
  return isPositionCoachRole(roleKey) && getCoachRoleForPosition(position) === roleKey;
}
