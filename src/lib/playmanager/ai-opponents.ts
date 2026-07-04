export const PLAYMANAGER_AI_CLUBS = [
  { rowOrder: 2, name: 'AIFC Milan' },
  { rowOrder: 3, name: 'Manchester United AIFC' },
  { rowOrder: 4, name: 'Arsenal AIFC' },
  { rowOrder: 5, name: 'Real Madrid AIFC' },
  { rowOrder: 6, name: 'PSG AIFC' },
  { rowOrder: 7, name: 'Barcelona AIFC' },
  { rowOrder: 8, name: 'Liverpool AIFC' },
] as const;

export const PLAYMANAGER_FIXTURE_ROW_ORDER = [8, 7, 6, 5, 4, 3, 2] as const;

export const DEFAULT_PLAYMANAGER_OPPONENT = 'Liverpool AIFC';

export function getPlayManagerFixtureOpponentRowOrder(playedMatches: number) {
  const safePlayedMatches = Math.max(0, Math.trunc(playedMatches));
  return PLAYMANAGER_FIXTURE_ROW_ORDER[safePlayedMatches % PLAYMANAGER_FIXTURE_ROW_ORDER.length];
}

export function getPlayManagerNextOpponent(
  standingRows: Array<{ club_name: string; row_order: number }> | null | undefined,
  playedMatches: number | null | undefined,
) {
  const nextRowOrder = getPlayManagerFixtureOpponentRowOrder(playedMatches ?? 0);
  const scheduledClub = standingRows?.find((row) => row.row_order === nextRowOrder)?.club_name;
  if (scheduledClub) return scheduledClub;

  const fallbackClub = PLAYMANAGER_AI_CLUBS.find((club) => club.rowOrder === nextRowOrder)?.name;
  return fallbackClub ?? DEFAULT_PLAYMANAGER_OPPONENT;
}
