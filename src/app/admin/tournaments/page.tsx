import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminTournamentsClient, type AdminTournamentRow, type GameOption } from "./admin-tournaments-client";

export const dynamic = "force-dynamic";

type GameJoin = { slug: string; name_ka: string; emoji: string | null; icon_url: string | null } | null;

export default async function AdminTournamentsPage() {
  const admin = createSupabaseAdminClient();

  const [{ data: tournaments }, { data: games }] = await Promise.all([
    admin
      .from("tournaments")
      .select(
        "id, name, slug, format, status, max_participants, prize_pool, starts_at, created_at, games(slug, name_ka, emoji, icon_url), tournament_participants(count)",
      )
      .order("created_at", { ascending: false }),
    admin
      .from("games")
      .select("id, slug, name_ka, emoji, icon_url")
      .eq("active", true)
      .order("position", { ascending: true }),
  ]);

  const rows: AdminTournamentRow[] = (tournaments ?? []).map((t) => {
    const g = (Array.isArray(t.games) ? t.games[0] : t.games) as GameJoin;
    const pc = t.tournament_participants as unknown as { count: number }[] | null;
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      format: t.format,
      status: t.status,
      maxParticipants: t.max_participants,
      prizePool: t.prize_pool,
      startsAt: t.starts_at,
      participantCount: pc?.[0]?.count ?? 0,
      gameSlug: g?.slug ?? "",
      gameNameKa: g?.name_ka ?? "—",
      gameEmoji: g?.emoji ?? "🎮",
      gameIconUrl: g?.icon_url ?? null,
    };
  });

  const gameOptions: GameOption[] = (games ?? []).map((g) => ({
    id: g.id,
    slug: g.slug,
    nameKa: g.name_ka,
    emoji: g.emoji ?? "🎮",
    iconUrl: g.icon_url ?? null,
  }));

  return <AdminTournamentsClient tournaments={rows} games={gameOptions} />;
}
