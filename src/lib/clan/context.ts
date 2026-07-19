import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { isClanManager } from "@/lib/clan/roles";

export type ClanRole = "leader" | "co_leader" | "manager" | "officer" | "member" | "none";

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type ClanTournamentItem = {
  slug: string;
  name: string;
  status: string;
  isPractice: boolean;
  prizePool: string | null;
  current: number;
  max: number;
  startsAt: string | null;
  registered: boolean;
};

// The clan-game's competitive tournaments (isPractice=false) or practice games
// (isPractice=true), with this clan's registration status folded in.
export async function getClanTournaments(
  supabase: SupabaseServer,
  gameId: string,
  clanId: string,
  isPractice: boolean,
): Promise<ClanTournamentItem[]> {
  const { data } = await supabase
    .from("tournaments")
    .select("slug, name, status, is_practice, prize_pool, max_participants, starts_at, tournament_participants(id, clan_id)")
    .eq("game_id", gameId)
    .eq("is_practice", isPractice)
    .in("status", ["open", "checkin", "live"])
    .order("starts_at", { ascending: true })
    .limit(50);
  return ((data ?? []) as unknown as Array<{
    slug: string; name: string; status: string; is_practice: boolean;
    prize_pool: string | null; max_participants: number | null; starts_at: string | null;
    tournament_participants: { id: string; clan_id: string | null }[] | null;
  }>).map((t) => {
    const parts = t.tournament_participants ?? [];
    return {
      slug: t.slug,
      name: t.name,
      status: t.status,
      isPractice: !!t.is_practice,
      prizePool: t.prize_pool,
      current: parts.length,
      max: t.max_participants ?? 8,
      startsAt: t.starts_at,
      registered: parts.some((p) => p.clan_id === clanId),
    };
  });
}

export type ClanTrophyStats = {
  championships: number;
  tournamentsEntered: number;
  scrimsPlayed: number;
};

export type ClanTournamentRegistration = {
  tournamentId: string;
  name: string;
  slug: string;
  isPractice: boolean;
  registeredAt: string | null;
  userId: string;
};

export type ClanFixture = {
  tournamentId: string;
  name: string;
  slug: string;
  isPractice: boolean;
  status: string;
  startsAt: string | null;
};

export type ClanMatchResult = {
  id: string;
  opponentName: string;
  result: "win" | "loss" | "draw";
  ourScore: number | null;
  theirScore: number | null;
  isPractice: boolean;
  playedAt: string;
  tournamentName: string | null;
  tournamentSlug: string | null;
};

// One row per clan tournament entry (the clan's participant row + its tournament
// metadata). Fetched ONCE and reused for trophy / fixtures / match-results so the
// clan page doesn't hit tournament_participants three separate times.
type ClanEntryRow = {
  userId: string;
  registeredAt: string | null;
  tournamentId: string;
  name: string;
  slug: string;
  isPractice: boolean;
  status: string;
  winnerId: string | null;
  startsAt: string | null;
};

async function fetchClanEntries(supabase: SupabaseServer, clanId: string): Promise<ClanEntryRow[]> {
  const { data } = await supabase
    .from("tournament_participants")
    .select("user_id, registered_at, tournaments!inner ( id, name, slug, is_practice, status, winner_id, starts_at )")
    .eq("clan_id", clanId);

  return ((data ?? []) as unknown as Array<{
    user_id: string;
    registered_at: string | null;
    tournaments: { id: string; name: string; slug: string; is_practice: boolean; status: string; winner_id: string | null; starts_at: string | null } | null;
  }>)
    .filter((r) => r.tournaments)
    .map((r) => ({
      userId: r.user_id,
      registeredAt: r.registered_at,
      tournamentId: r.tournaments!.id,
      name: r.tournaments!.name,
      slug: r.tournaments!.slug,
      isPractice: r.tournaments!.is_practice,
      status: r.tournaments!.status,
      winnerId: r.tournaments!.winner_id,
      startsAt: r.tournaments!.starts_at,
    }));
}

// championships = completed tournaments whose winner is this clan's captain-of-record.
function computeTrophy(rows: ClanEntryRow[]): { stats: ClanTrophyStats; registrations: ClanTournamentRegistration[] } {
  const comp = rows.filter((r) => !r.isPractice);
  const practice = rows.filter((r) => r.isPractice);
  const championships = comp.filter((r) => r.status === "completed" && !!r.winnerId && r.winnerId === r.userId).length;
  return {
    stats: {
      championships,
      tournamentsEntered: new Set(comp.map((r) => r.tournamentId)).size,
      scrimsPlayed: new Set(practice.map((r) => r.tournamentId)).size,
    },
    registrations: rows.map((r) => ({
      tournamentId: r.tournamentId,
      name: r.name,
      slug: r.slug,
      isPractice: r.isPractice,
      registeredAt: r.registeredAt,
      userId: r.userId,
    })),
  };
}

// Upcoming fixtures = registered tournaments/scrims that haven't finished.
function computeFixtures(rows: ClanEntryRow[]): ClanFixture[] {
  return rows
    .filter((r) => ["draft", "open", "checkin", "live"].includes(r.status))
    .map((r) => ({ tournamentId: r.tournamentId, name: r.name, slug: r.slug, isPractice: r.isPractice, status: r.status, startsAt: r.startsAt }))
    .sort((a, b) => (a.startsAt ? +new Date(a.startsAt) : Infinity) - (b.startsAt ? +new Date(b.startsAt) : Infinity));
}

// Match RESULTS derived from the tournament engine's played matches. For a clan
// entry the captain's user id is the participant, so a match belongs to the clan
// when the captain is player1/player2. Reuses the already-fetched entry rows for
// tournament metadata (no extra tournaments query).
async function deriveMatchResults(
  supabase: SupabaseServer,
  entries: ClanEntryRow[],
): Promise<{ results: ClanMatchResult[]; record: { w: number; l: number; d: number } }> {
  if (entries.length === 0) return { results: [], record: { w: 0, l: 0, d: 0 } };

  const tournamentIds = [...new Set(entries.map((r) => r.tournamentId))];
  const captainByTournament = new Map(entries.map((r) => [r.tournamentId, r.userId]));
  const tById = new Map(entries.map((r) => [r.tournamentId, { name: r.name, slug: r.slug, isPractice: r.isPractice }]));

  const [{ data: matchesData }, { data: parts }] = await Promise.all([
    supabase
      .from("tournament_matches")
      .select("id, tournament_id, player1_id, player2_id, score1, score2, winner_id, status, scheduled_at, created_at")
      .in("tournament_id", tournamentIds),
    supabase.from("tournament_participants").select("tournament_id, user_id, team_name, profiles ( username, display_name )").in("tournament_id", tournamentIds),
  ]);

  const nameByKey = new Map<string, string>();
  ((parts ?? []) as unknown as Array<{ tournament_id: string; user_id: string; team_name: string | null; profiles: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null }>).forEach((p) => {
    const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    nameByKey.set(`${p.tournament_id}:${p.user_id}`, p.team_name || prof?.display_name || prof?.username || "მოწინააღმდეგე");
  });

  const results: ClanMatchResult[] = [];
  for (const m of (matchesData ?? []) as Array<{
    id: string; tournament_id: string; player1_id: string | null; player2_id: string | null;
    score1: number | null; score2: number | null; winner_id: string | null; status: string;
    scheduled_at: string | null; created_at: string;
  }>) {
    const captain = captainByTournament.get(m.tournament_id);
    if (!captain) continue;
    const isP1 = m.player1_id === captain;
    const isP2 = m.player2_id === captain;
    if (!isP1 && !isP2) continue;
    if (!["reported", "confirmed"].includes(m.status) && m.winner_id == null) continue; // only played matches
    const oppId = isP1 ? m.player2_id : m.player1_id;
    if (!oppId) continue; // bye
    const ourScore = isP1 ? m.score1 : m.score2;
    const theirScore = isP1 ? m.score2 : m.score1;
    const result: "win" | "loss" | "draw" = m.winner_id === captain ? "win" : m.winner_id === oppId ? "loss" : "draw";
    const t = tById.get(m.tournament_id);
    results.push({
      id: m.id,
      opponentName: nameByKey.get(`${m.tournament_id}:${oppId}`) ?? "მოწინააღმდეგე",
      result,
      ourScore: ourScore ?? null,
      theirScore: theirScore ?? null,
      isPractice: !!t?.isPractice,
      playedAt: m.scheduled_at ?? m.created_at,
      tournamentName: t?.name ?? null,
      tournamentSlug: t?.slug ?? null,
    });
  }
  results.sort((a, b) => +new Date(b.playedAt) - +new Date(a.playedAt));
  const record = {
    w: results.filter((r) => r.result === "win").length,
    l: results.filter((r) => r.result === "loss").length,
    d: results.filter((r) => r.result === "draw").length,
  };
  return { results, record };
}

export async function getClanTrophyData(supabase: SupabaseServer, clanId: string) {
  return computeTrophy(await fetchClanEntries(supabase, clanId));
}

export async function getClanFixtures(supabase: SupabaseServer, clanId: string): Promise<ClanFixture[]> {
  return computeFixtures(await fetchClanEntries(supabase, clanId));
}

export async function getClanMatchResults(supabase: SupabaseServer, clanId: string) {
  return deriveMatchResults(supabase, await fetchClanEntries(supabase, clanId));
}

// Combined loader for the clan detail page — fetches the clan's tournament entries
// ONCE and derives trophy + fixtures + match results from it (3 queries total
// instead of 6 across the three standalone helpers above).
export async function getClanCompetitiveData(supabase: SupabaseServer, clanId: string): Promise<{
  trophy: { stats: ClanTrophyStats; registrations: ClanTournamentRegistration[] };
  fixtures: ClanFixture[];
  matches: { results: ClanMatchResult[]; record: { w: number; l: number; d: number } };
}> {
  const entries = await fetchClanEntries(supabase, clanId);
  return {
    trophy: computeTrophy(entries),
    fixtures: computeFixtures(entries),
    matches: await deriveMatchResults(supabase, entries),
  };
}

export type ClanPowerEntry = { rating: number; games: number; w: number; l: number; d: number };

// Cookieless anon client for cached, viewer-independent reads of public data
// (tournaments/participants/matches are all publicly selectable).
function anonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

// Clan POWER RATING — a derived competitive rating (ELO). 100% computed from the
// tournament engine's played matches (no stored value, no write path, no grant
// surface). Replays every clan-vs-someone match chronologically from a 1000 base;
// individuals (non-clan opponents) act as a fixed 1000-rated baseline.
//
// This is a GLOBAL scan (every match, every clan) and viewer-independent, so it
// runs on a cookieless client and is cached — otherwise it would re-scan the whole
// match table on every clan/leaderboard page view. Returns a plain record (Map
// isn't cache-serializable); getClanPowerRatings rebuilds the Map at the edge.
async function computeClanPowerRatings(): Promise<Record<string, ClanPowerEntry>> {
  const supabase = anonClient();
  const [{ data: parts }, { data: matchesData }] = await Promise.all([
    supabase.from("tournament_participants").select("tournament_id, user_id, clan_id").not("clan_id", "is", null),
    supabase.from("tournament_matches").select("tournament_id, player1_id, player2_id, winner_id, status, scheduled_at, created_at"),
  ]);

  const clanByKey = new Map<string, string>();
  ((parts ?? []) as { tournament_id: string; user_id: string; clan_id: string }[]).forEach((p) => {
    clanByKey.set(`${p.tournament_id}:${p.user_id}`, p.clan_id);
  });

  const played = ((matchesData ?? []) as Array<{
    tournament_id: string; player1_id: string | null; player2_id: string | null;
    winner_id: string | null; status: string; scheduled_at: string | null; created_at: string;
  }>)
    .filter((m) => m.player1_id && m.player2_id && (["reported", "confirmed"].includes(m.status) || m.winner_id != null))
    .sort((a, b) => new Date(a.scheduled_at ?? a.created_at).getTime() - new Date(b.scheduled_at ?? b.created_at).getTime());

  const BASE = 1000;
  const K = 32;
  const ratings = new Map<string, ClanPowerEntry>();
  const entry = (id: string) => ratings.get(id) ?? { rating: BASE, games: 0, w: 0, l: 0, d: 0 };

  for (const m of played) {
    const clanA = clanByKey.get(`${m.tournament_id}:${m.player1_id}`) ?? null;
    const clanB = clanByKey.get(`${m.tournament_id}:${m.player2_id}`) ?? null;
    if (!clanA && !clanB) continue;

    const eA = clanA ? entry(clanA) : null;
    const eB = clanB ? entry(clanB) : null;
    const rA = eA ? eA.rating : BASE;
    const rB = eB ? eB.rating : BASE;

    const sA = m.winner_id === m.player1_id ? 1 : m.winner_id === m.player2_id ? 0 : 0.5;
    const expA = 1 / (1 + Math.pow(10, (rB - rA) / 400));

    if (clanA && eA) {
      eA.rating = rA + K * (sA - expA);
      eA.games += 1;
      if (sA === 1) eA.w += 1;
      else if (sA === 0) eA.l += 1;
      else eA.d += 1;
      ratings.set(clanA, eA);
    }
    if (clanB && eB) {
      eB.rating = rB + K * (1 - sA - (1 - expA));
      eB.games += 1;
      if (sA === 0) eB.w += 1;
      else if (sA === 1) eB.l += 1;
      else eB.d += 1;
      ratings.set(clanB, eB);
    }
  }

  const out: Record<string, ClanPowerEntry> = {};
  for (const [k, v] of ratings) out[k] = { ...v, rating: Math.round(v.rating) };
  return out;
}

const cachedClanPowerRatings = unstable_cache(computeClanPowerRatings, ["clan-power-ratings"], {
  revalidate: 60,
  tags: ["clan-power"],
});

export async function getClanPowerRatings(): Promise<Map<string, ClanPowerEntry>> {
  return new Map(Object.entries(await cachedClanPowerRatings()));
}

// Resolves a game + the viewer's clan FOR THAT GAME (if any). Powers the
// game-level tournaments/scrims listing pages, which are game-scoped entities the
// viewer's clan can register for (register buttons show only for leader/officer).
export async function getGameTournamentContext(gameSlug: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: game }, session] = await Promise.all([
    supabase.from("games").select("id, slug, name_ka, icon_url").eq("slug", gameSlug).maybeSingle(),
    getSession().catch(() => null),
  ]);
  if (!game) return null;

  let clan: { id: string; slug: string; role: ClanRole } | null = null;
  if (session) {
    const { data: m } = await supabase
      .from("clan_members")
      .select("role, clan_id, clans!inner ( slug, game_slug )")
      .eq("user_id", session.id)
      .eq("clans.game_slug", gameSlug)
      .maybeSingle();
    if (m) {
      const c = Array.isArray(m.clans) ? m.clans[0] : m.clans;
      clan = { id: m.clan_id as string, slug: (c as { slug: string }).slug, role: m.role as ClanRole };
    }
  }

  return {
    supabase,
    game,
    session,
    clan,
    canRegister: !!clan && isClanManager(clan.role),
  };
}

// Shared loader for the game-scoped clan sub-pages
// (/games/[slug]/{clanchat,rosters,schedule,matches}/[clanSlug]). Resolves the
// clan + game, verifies the clan actually belongs to that game, and computes the
// viewer's role. Returns null when the clan/game is missing or mismatched (→ 404).
export async function getClanGameContext(gameSlug: string, clanSlug: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: clan }, session] = await Promise.all([
    supabase
      .from("clans")
      .select("id, name, slug, tag, avatar_url, banner_url, game_slug, level, xp")
      .eq("slug", clanSlug)
      .maybeSingle(),
    getSession().catch(() => null),
  ]);
  if (!clan || clan.game_slug !== gameSlug) return null;

  const { data: game } = await supabase
    .from("games")
    .select("id, slug, name_ka, icon_url, cover_url")
    .eq("slug", gameSlug)
    .maybeSingle();
  if (!game) return null;

  let role: ClanRole = "none";
  if (session) {
    const { data: m } = await supabase
      .from("clan_members")
      .select("role")
      .eq("clan_id", clan.id)
      .eq("user_id", session.id)
      .maybeSingle();
    if (m) role = m.role as ClanRole;
  }

  return {
    supabase,
    clan,
    game,
    session,
    role,
    isMember: role !== "none",
    canManage: isClanManager(role),
  };
}
