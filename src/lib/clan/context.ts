import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

export type ClanRole = "leader" | "officer" | "member" | "none";

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

// Shared loader for the game-scoped clan sub-pages
// (/games/[slug]/{tournaments,scrims,clanchat,rosters}/[clanSlug]). Resolves the
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
    canManage: role === "leader" || role === "officer",
  };
}
