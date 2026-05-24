export function getLobbyLoadoutStorageKey(gameSlug: string, userId: string) {
  return `lobby:loadout:${gameSlug}:${userId}`;
}
