// Talent classes — the raw 1–12 talent value groups into 6 named identity tiers.
// Each class carries its visual identity (label + colour) AND its gameplay weight:
//   - ageOffset: shifts the age-decay thresholds (peak window + decay resistance).
//     A higher class peaks later and resists the 32/36 decline longer.
//   - valueMultiplier: transfer-value premium for the player's ceiling (potential).
// The DB mirrors ageOffset / class boundaries in pm_player_talent_class* functions;
// keep the two in sync if either side changes.

export type TalentClassKey = 'pro' | 'star' | 'elite' | 'world_class' | 'rising_star' | 'legend';

export type TalentClass = {
  key: TalentClassKey;
  label: string;
  /** Lower bound of the raw talent range that maps to this class. */
  min: number;
  /** Upper bound (inclusive). */
  max: number;
  /** Years added to the 32 / 36 age-decay thresholds for this class. */
  ageOffset: number;
  /** Transfer-value multiplier reflecting the class ceiling. */
  valueMultiplier: number;
  /** Primary accent colour (hex). */
  color: string;
  /** Soft border colour (rgba) for badges. */
  border: string;
  /** Soft background tint (rgba) for badges. */
  bg: string;
};

export const TALENT_MIN = 1;
export const TALENT_MAX = 12;

// Ordered low → high. getTalentClass scans top-down so single-value tiers win.
const TALENT_CLASSES: readonly TalentClass[] = [
  { key: 'pro',         label: 'პრო',                 min: 1,  max: 3,  ageOffset: -1, valueMultiplier: 1.0,   color: '#9aa0aa', border: 'rgba(154,160,170,0.35)', bg: 'rgba(154,160,170,0.12)' },
  { key: 'star',        label: 'ვარსკვლავი',          min: 4,  max: 6,  ageOffset: 0,  valueMultiplier: 1.0,   color: '#34d399', border: 'rgba(52,211,153,0.35)',  bg: 'rgba(52,211,153,0.12)' },
  { key: 'elite',       label: 'ელიტა',               min: 7,  max: 9,  ageOffset: 1,  valueMultiplier: 1.05,  color: '#38bdf8', border: 'rgba(56,189,248,0.38)',  bg: 'rgba(56,189,248,0.12)' },
  { key: 'world_class', label: 'მსოფლიო კლასი',       min: 10, max: 10, ageOffset: 2,  valueMultiplier: 1.12,  color: '#a855f7', border: 'rgba(168,85,247,0.42)',  bg: 'rgba(168,85,247,0.14)' },
  { key: 'rising_star', label: 'ამომავალი ვარსკვლავი', min: 11, max: 11, ageOffset: 3,  valueMultiplier: 1.202, color: '#fbbf24', border: 'rgba(251,191,36,0.45)',  bg: 'rgba(251,191,36,0.14)' },
  { key: 'legend',      label: 'ლეგენდა',             min: 12, max: 12, ageOffset: 4,  valueMultiplier: 1.35,  color: '#fde047', border: 'rgba(253,224,71,0.5)',   bg: 'rgba(253,224,71,0.16)' },
] as const;

export function clampTalent(talent: number): number {
  if (!Number.isFinite(talent)) return TALENT_MIN;
  return Math.max(TALENT_MIN, Math.min(TALENT_MAX, Math.trunc(talent)));
}

/** Resolve the named class for a raw talent value (1–12). */
export function getTalentClass(talent: number): TalentClass {
  const t = clampTalent(talent);
  // Scan high → low so the single-value elite tiers (10/11/12) win cleanly.
  for (let i = TALENT_CLASSES.length - 1; i >= 0; i -= 1) {
    if (t >= TALENT_CLASSES[i].min) return TALENT_CLASSES[i];
  }
  return TALENT_CLASSES[0];
}

/** All classes, high → low — for legends / pickers. */
export function getTalentClassLadder(): TalentClass[] {
  return [...TALENT_CLASSES].reverse();
}
