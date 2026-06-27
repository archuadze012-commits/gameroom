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
