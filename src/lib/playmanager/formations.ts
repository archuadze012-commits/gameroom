// Shared formation + tactics presets for the PlayManager squad/tactics studio.
// Kept framework-free so both the lineup studio and the city editor can import
// the same source of truth (slot positions are percentages on a vertical pitch,
// GK at the bottom ~99%, strikers at the top ~20-25%).

export type FormationSlot = { label: string; top: number; left: number; index: number };

export const PRESET_FORMATIONS: Record<string, FormationSlot[]> = {
  '4-3-3': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LB', top: 80, left: 12, index: 1 },
    { label: 'LCB', top: 85, left: 33, index: 2 },
    { label: 'RCB', top: 85, left: 67, index: 3 },
    { label: 'RB', top: 80, left: 88, index: 4 },
    { label: 'CDM', top: 67, left: 50, index: 5 },
    { label: 'CM', top: 55, left: 33, index: 6 },
    { label: 'CM', top: 55, left: 66, index: 7 },
    { label: 'LW', top: 33, left: 14, index: 8 },
    { label: 'ST', top: 25, left: 50, index: 9 },
    { label: 'RW', top: 33, left: 86, index: 10 },
  ],
  '4-4-2': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LB', top: 80, left: 12, index: 1 },
    { label: 'LCB', top: 85, left: 33, index: 2 },
    { label: 'RCB', top: 85, left: 67, index: 3 },
    { label: 'RB', top: 80, left: 88, index: 4 },
    { label: 'LM', top: 55, left: 15, index: 5 },
    { label: 'CM', top: 55, left: 35, index: 6 },
    { label: 'CM', top: 55, left: 65, index: 7 },
    { label: 'RM', top: 55, left: 85, index: 8 },
    { label: 'ST', top: 25, left: 35, index: 9 },
    { label: 'ST', top: 25, left: 65, index: 10 },
  ],
  '3-5-2': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LCB', top: 85, left: 25, index: 1 },
    { label: 'CB', top: 85, left: 50, index: 2 },
    { label: 'RCB', top: 85, left: 75, index: 3 },
    { label: 'LM', top: 55, left: 15, index: 4 },
    { label: 'CDM', top: 67, left: 35, index: 5 },
    { label: 'CDM', top: 67, left: 65, index: 6 },
    { label: 'RM', top: 55, left: 85, index: 7 },
    { label: 'CAM', top: 40, left: 50, index: 8 },
    { label: 'ST', top: 25, left: 35, index: 9 },
    { label: 'ST', top: 25, left: 65, index: 10 },
  ],
  '4-2-3-1': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LB', top: 80, left: 12, index: 1 },
    { label: 'LCB', top: 85, left: 33, index: 2 },
    { label: 'RCB', top: 85, left: 67, index: 3 },
    { label: 'RB', top: 80, left: 88, index: 4 },
    { label: 'CDM', top: 67, left: 35, index: 5 },
    { label: 'CDM', top: 67, left: 65, index: 6 },
    { label: 'CAM', top: 40, left: 25, index: 7 },
    { label: 'CAM', top: 40, left: 50, index: 8 },
    { label: 'CAM', top: 40, left: 75, index: 9 },
    { label: 'ST', top: 25, left: 50, index: 10 },
  ],
  '3-4-3': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LCB', top: 85, left: 25, index: 1 },
    { label: 'CB', top: 85, left: 50, index: 2 },
    { label: 'RCB', top: 85, left: 75, index: 3 },
    { label: 'LM', top: 60, left: 15, index: 4 },
    { label: 'CM', top: 60, left: 35, index: 5 },
    { label: 'CM', top: 60, left: 65, index: 6 },
    { label: 'RM', top: 60, left: 85, index: 7 },
    { label: 'LW', top: 30, left: 20, index: 8 },
    { label: 'ST', top: 25, left: 50, index: 9 },
    { label: 'RW', top: 30, left: 80, index: 10 },
  ],
  '5-3-2': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LWB', top: 75, left: 10, index: 1 },
    { label: 'LCB', top: 85, left: 30, index: 2 },
    { label: 'CB', top: 85, left: 50, index: 3 },
    { label: 'RCB', top: 85, left: 70, index: 4 },
    { label: 'RWB', top: 75, left: 90, index: 5 },
    { label: 'CM', top: 55, left: 30, index: 6 },
    { label: 'CM', top: 55, left: 50, index: 7 },
    { label: 'CM', top: 55, left: 70, index: 8 },
    { label: 'ST', top: 25, left: 35, index: 9 },
    { label: 'ST', top: 25, left: 65, index: 10 },
  ],
  '5-4-1': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LWB', top: 75, left: 10, index: 1 },
    { label: 'LCB', top: 85, left: 30, index: 2 },
    { label: 'CB', top: 85, left: 50, index: 3 },
    { label: 'RCB', top: 85, left: 70, index: 4 },
    { label: 'RWB', top: 75, left: 90, index: 5 },
    { label: 'LM', top: 55, left: 20, index: 6 },
    { label: 'CM', top: 55, left: 40, index: 7 },
    { label: 'CM', top: 55, left: 60, index: 8 },
    { label: 'RM', top: 55, left: 80, index: 9 },
    { label: 'ST', top: 25, left: 50, index: 10 },
  ],
  '4-1-2-1-2': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LB', top: 80, left: 12, index: 1 },
    { label: 'LCB', top: 85, left: 33, index: 2 },
    { label: 'RCB', top: 85, left: 67, index: 3 },
    { label: 'RB', top: 80, left: 88, index: 4 },
    { label: 'CDM', top: 67, left: 50, index: 5 },
    { label: 'CM', top: 52, left: 25, index: 6 },
    { label: 'CM', top: 52, left: 75, index: 7 },
    { label: 'CAM', top: 38, left: 50, index: 8 },
    { label: 'ST', top: 25, left: 35, index: 9 },
    { label: 'ST', top: 25, left: 65, index: 10 },
  ],
  '4-3-2-1': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LB', top: 80, left: 12, index: 1 },
    { label: 'LCB', top: 85, left: 33, index: 2 },
    { label: 'RCB', top: 85, left: 67, index: 3 },
    { label: 'RB', top: 80, left: 88, index: 4 },
    { label: 'CM', top: 55, left: 25, index: 5 },
    { label: 'CM', top: 55, left: 50, index: 6 },
    { label: 'CM', top: 55, left: 75, index: 7 },
    { label: 'CAM', top: 38, left: 35, index: 8 },
    { label: 'CAM', top: 38, left: 65, index: 9 },
    { label: 'ST', top: 20, left: 50, index: 10 },
  ],
  '4-5-1': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LB', top: 80, left: 12, index: 1 },
    { label: 'LCB', top: 85, left: 33, index: 2 },
    { label: 'RCB', top: 85, left: 67, index: 3 },
    { label: 'RB', top: 80, left: 88, index: 4 },
    { label: 'LM', top: 55, left: 15, index: 5 },
    { label: 'CM', top: 55, left: 33, index: 6 },
    { label: 'CM', top: 55, left: 50, index: 7 },
    { label: 'CM', top: 55, left: 67, index: 8 },
    { label: 'RM', top: 55, left: 85, index: 9 },
    { label: 'ST', top: 25, left: 50, index: 10 },
  ],
  '4-1-4-1': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LB', top: 80, left: 12, index: 1 },
    { label: 'LCB', top: 85, left: 33, index: 2 },
    { label: 'RCB', top: 85, left: 67, index: 3 },
    { label: 'RB', top: 80, left: 88, index: 4 },
    { label: 'CDM', top: 67, left: 50, index: 5 },
    { label: 'LM', top: 45, left: 15, index: 6 },
    { label: 'CM', top: 45, left: 35, index: 7 },
    { label: 'CM', top: 45, left: 65, index: 8 },
    { label: 'RM', top: 45, left: 85, index: 9 },
    { label: 'ST', top: 25, left: 50, index: 10 },
  ],
  '4-4-1-1': [
    { label: 'GK', top: 99, left: 50, index: 0 },
    { label: 'LB', top: 80, left: 12, index: 1 },
    { label: 'LCB', top: 85, left: 33, index: 2 },
    { label: 'RCB', top: 85, left: 67, index: 3 },
    { label: 'RB', top: 80, left: 88, index: 4 },
    { label: 'LM', top: 55, left: 15, index: 5 },
    { label: 'CM', top: 55, left: 35, index: 6 },
    { label: 'CM', top: 55, left: 65, index: 7 },
    { label: 'RM', top: 55, left: 85, index: 8 },
    { label: 'CF', top: 38, left: 50, index: 9 },
    { label: 'ST', top: 20, left: 50, index: 10 },
  ],
};

export const FORMATION_KEYS = Object.keys(PRESET_FORMATIONS);

export type TacticalStyle = 'balanced' | 'pressing' | 'possession' | 'counter';
export type DefensiveLine = 'low' | 'mid' | 'high';
export type Tempo = 'controlled' | 'balanced' | 'direct';
export type FocusSide = 'left' | 'center' | 'right';

export type MatchTactics = {
  tacticalStyle: TacticalStyle;
  defensiveLine: DefensiveLine;
  tempo: Tempo;
  focusSide: FocusSide;
};

export const TACTICAL_STYLE_OPTIONS = [
  ['balanced', 'ბალანსი'],
  ['pressing', 'პრესინგი'],
  ['possession', 'ბურთის ფლობა'],
  ['counter', 'კონტრშეტევა'],
] as const satisfies readonly (readonly [TacticalStyle, string])[];

export const DEFENSIVE_LINE_OPTIONS = [
  ['low', 'დაბალი ხაზი'],
  ['mid', 'საშუალო ხაზი'],
  ['high', 'მაღალი ხაზი'],
] as const satisfies readonly (readonly [DefensiveLine, string])[];

export const TEMPO_OPTIONS = [
  ['controlled', 'კონტროლი'],
  ['balanced', 'ბალანსი'],
  ['direct', 'პირდაპირი'],
] as const satisfies readonly (readonly [Tempo, string])[];

export const FOCUS_SIDE_OPTIONS = [
  ['left', 'მარცხენა'],
  ['center', 'ცენტრი'],
  ['right', 'მარჯვენა'],
] as const satisfies readonly (readonly [FocusSide, string])[];
