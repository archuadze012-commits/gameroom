const WEIGHTS: Record<string, number[]> = {
  GK: [0.84, 0.35, 0.7, 0.55, 0.65, 0.82],
  CB: [0.81, 0.52, 0.72, 0.62, 1.28, 1.06],
  RB: [0.98, 0.52, 0.82, 0.88, 1.06, 0.72],
  LB: [0.98, 0.52, 0.82, 0.88, 1.06, 0.72],
  CDM: [0.82, 0.62, 1.08, 0.82, 1.16, 0.88],
  CM: [0.9, 0.82, 1.16, 0.98, 0.82, 0.82],
  CAM: [0.92, 1.02, 1.16, 1.16, 0.52, 0.72],
  LW: [1.16, 1, 0.8, 1.26, 0.5, 0.7],
  RW: [1.16, 1, 0.8, 1.26, 0.5, 0.7],
  ST: [1.08, 1.26, 0.7, 1.08, 0.42, 0.9],
  CF: [0.9, 1.15, 0.85, 1.1, 0.5, 1.05],
  LM: [1.05, 0.85, 1.05, 1.05, 0.6, 0.7],
  RM: [1.05, 0.85, 1.05, 1.05, 0.6, 0.7],
  AM: [0.92, 1.02, 1.16, 1.16, 0.52, 0.72],
};

const GK_LABELS = ['DIV', 'HAN', 'KIC', 'REF', 'SPD', 'POS'] as const;
const OUT_LABELS = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'] as const;

export function derivePlayerStats(position: string, ovr: number) {
  const labels = position === 'GK' ? GK_LABELS : OUT_LABELS;
  const weights = WEIGHTS[position] ?? [1, 1, 1, 1, 1, 1];

  return labels.map((label, index) => ({
    label,
    value: Math.min(99, Math.max(35, Math.round(ovr * weights[index]!))),
  }));
}
