// Quarter (season) boundary math for PlayGame Wrapped.
// Pure, dependency-free — safe to import from server components, the OG image
// route, and client components alike.

export type Season = {
  year: number;
  /** 1-4 */
  quarter: number;
  /** inclusive UTC start (quarter first day, 00:00) */
  start: Date;
  /** exclusive UTC end (next quarter first day, 00:00) */
  end: Date;
  startIso: string;
  endIso: string;
  /** e.g. "Q3 2026" */
  code: string;
  /** Georgian seasonal name, e.g. "ზაფხული 2026" */
  labelKa: string;
  daysTotal: number;
  daysElapsed: number;
  daysRemaining: number;
  /** true once we are past the quarter's end (a fully finished season) */
  isComplete: boolean;
};

const SEASON_KA = ["ზამთარი", "გაზაფხული", "ზაფხული", "შემოდგომა"] as const;

function daysBetween(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

/**
 * Resolve the season that `now` falls into. Defaults to the current quarter.
 * All boundaries are UTC so counts line up with `created_at` (timestamptz).
 */
export function getSeason(now: Date = new Date()): Season {
  const year = now.getUTCFullYear();
  const quarter = Math.floor(now.getUTCMonth() / 3) + 1;

  const start = new Date(Date.UTC(year, (quarter - 1) * 3, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, quarter * 3, 1, 0, 0, 0, 0));

  const daysTotal = daysBetween(start, end);
  const clampedNow = now.getTime() > end.getTime() ? end : now;
  const daysElapsed = daysBetween(start, clampedNow);

  return {
    year,
    quarter,
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    code: `Q${quarter} ${year}`,
    labelKa: `${SEASON_KA[quarter - 1]} ${year}`,
    daysTotal,
    daysElapsed,
    daysRemaining: Math.max(0, daysTotal - daysElapsed),
    isComplete: now.getTime() >= end.getTime(),
  };
}
