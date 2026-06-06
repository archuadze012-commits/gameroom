const LOCAL_COVER_SLUGS = new Set([
  "eafc26",
  "efootball-mobile",
  "pubg-battlegrounds",
  "pubg-mobile",
  "valorant",
  "warzone",
]);

export function getGameCoverCandidates(slug: string, coverUrl?: string | null): string[] {
  const candidates = [coverUrl?.trim() || null];

  if (LOCAL_COVER_SLUGS.has(slug)) {
    candidates.push(`/games/covers/${slug}.png`);
  }

  return candidates.filter((src, index, list): src is string => Boolean(src) && list.indexOf(src) === index);
}
