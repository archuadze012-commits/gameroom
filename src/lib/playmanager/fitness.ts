// PlayManager fitness / risk report — reads the squad's physical state (fatigue,
// injuries) and flags who is at risk and should be rotated. Pure + framework-free.

export type FitnessPlayer = {
  name: string;
  position: string;
  fatigue: number;
  morale: number;
  injuryMatches: number;
  availability: 'ready' | 'injured';
  role?: 'starter' | 'bench' | 'reserve';
};

export type FitnessRisk = 'out' | 'high' | 'elevated' | 'low';

export type FitnessRow = {
  name: string;
  position: string;
  fatigue: number;
  risk: FitnessRisk;
  note: string;
};

export type FitnessReport = {
  rows: FitnessRow[];
  highRiskCount: number;
  injuredCount: number;
  avgFatigue: number;
  headline: string;
};

function classify(p: FitnessPlayer): { risk: FitnessRisk; note: string } {
  if (p.availability === 'injured' || p.injuryMatches > 0) {
    return { risk: 'out', note: `ტრავმა · ${p.injuryMatches} მატჩი` };
  }
  if (p.fatigue >= 70) return { risk: 'high', note: 'მაღალი დაღლა — როტაცია სასწრაფოა' };
  if (p.fatigue >= 50) return { risk: 'elevated', note: 'ზომიერი დაღლა — თვალყური ადევნე' };
  return { risk: 'low', note: 'ფიზიკურად მზადაა' };
}

export function buildFitnessReport(players: FitnessPlayer[]): FitnessReport {
  const rows: FitnessRow[] = players.map((p) => {
    const { risk, note } = classify(p);
    return { name: p.name, position: p.position, fatigue: Math.round(p.fatigue), risk, note };
  });

  // Sort most-at-risk first.
  const order: Record<FitnessRisk, number> = { out: 0, high: 1, elevated: 2, low: 3 };
  rows.sort((a, b) => order[a.risk] - order[b.risk] || b.fatigue - a.fatigue);

  const injuredCount = rows.filter((r) => r.risk === 'out').length;
  const highRiskCount = rows.filter((r) => r.risk === 'high').length;
  const fit = players.filter((p) => p.availability !== 'injured' && p.injuryMatches === 0);
  const avgFatigue = fit.length
    ? Math.round(fit.reduce((s, p) => s + p.fatigue, 0) / fit.length)
    : 0;

  const headline = injuredCount + highRiskCount === 0
    ? 'შემადგენლობა ფიზიკურად სუფთაა — როტაცია სავალდებულო არ არის.'
    : `${injuredCount} ტრავმირებული · ${highRiskCount} მაღალი რისკის ქვეშ — დაგეგმე როტაცია.`;

  return { rows, highRiskCount, injuredCount, avgFatigue, headline };
}
