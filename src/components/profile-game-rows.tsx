import Link from "next/link";
import { Rocket } from "lucide-react";
import { mockGames, type MockGame } from "@/lib/mock-data";
import { GameIcon } from "@/components/game-icon";
import { Pill } from "@/components/ui/pill";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GamerCard } from "@/components/ui/gamer-card";

const LOBBY_GAMES = new Set<string>(["pubg-mobile"]);

export async function ProfileGameRows({ slugs, username }: { slugs: string[]; username: string }) {
  if (slugs.length === 0) {
    return (
      <GamerCard
        clipSize={14}
        surfaceClassName="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--gr-bg-1)_94%,black),color-mix(in_srgb,var(--gr-bg-2)_88%,black))]"
      >
        <div className="py-8 text-center text-[13px] text-[var(--gr-text-mute)]">
          ჯერ არცერთი თამაში არ არის არჩეული.
        </div>
      </GamerCard>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: dbGames } = await supabase
    .from("games")
    .select("slug, name_ka, name_en, description, accent_color, emoji, icon_url, cover_url")
    .in("slug", slugs);

  const dbMap = new Map<string, MockGame>(
    (dbGames ?? []).map((g) => [
      g.slug,
      {
        slug: g.slug,
        nameKa: g.name_ka,
        nameEn: g.name_en,
        description: g.description ?? "",
        accent: g.accent_color ?? "",
        emoji: g.emoji ?? "🎮",
        iconUrl: g.icon_url ?? undefined,
        coverUrl: g.cover_url ?? undefined,
        players: 0,
        online: 0,
        liveLfg: 0,
        favoritedBy: 0,
      },
    ])
  );

  const games = slugs
    .map((s) => dbMap.get(s) ?? mockGames.find((g) => g.slug === s))
    .filter(Boolean) as MockGame[];

  if (games.length === 0) {
    return (
      <GamerCard
        clipSize={14}
        surfaceClassName="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--gr-bg-1)_94%,black),color-mix(in_srgb,var(--gr-bg-2)_88%,black))]"
      >
        <div className="py-8 text-center text-[13px] text-[var(--gr-text-mute)]">
          ჯერ არცერთი თამაში არ არის არჩეული.
        </div>
      </GamerCard>
    );
  }

  return (
    <div className="space-y-2">
      {games.map((g, i) => {
        const isPrimary = i === 0;
        const hasLobby = LOBBY_GAMES.has(g.slug);
        return (
          <GamerCard
            key={g.slug}
            clipSize={14}
            hover
            className="transition-transform duration-200 hover:-translate-y-0.5"
            surfaceClassName="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--gr-bg-1)_96%,black),color-mix(in_srgb,var(--gr-bg-2)_88%,black))]"
          >
            <Link
              href={`/games/${g.slug}`}
              aria-label={g.nameKa}
              className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gr-magenta)]"
            />
            <div className="relative z-[1] flex items-center gap-3 p-3">
              <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-[var(--gr-bg-2)] ring-1 ring-[var(--gr-border)]">
                <GameIcon game={g} size="sm" />
              </div>
              <div className="relative z-[1] min-w-0 flex-1 pointer-events-none">
                <div className="truncate font-display text-[14px] font-bold uppercase tracking-tight text-[var(--gr-text)] group-hover:text-[var(--gr-cyan-glow)]">
                  {g.nameKa}
                </div>
                <div className="mt-0.5 truncate text-[11px] uppercase tracking-[0.12em] text-[var(--gr-text-dim)]">
                  <span className="tabular-nums text-[var(--gr-text-mute)]">{g.liveLfg}</span> აქტიური ლოკალი ·{" "}
                  <span className="tabular-nums text-[var(--gr-text-mute)]">{g.online}</span> ონლაინ
                </div>
              </div>

              {hasLobby ? (
                <Link
                  href={`/games/${g.slug}/lobby?user=${encodeURIComponent(username)}`}
                  className="relative z-[2] inline-flex items-center gap-1.5 bg-[linear-gradient(135deg,var(--gr-magenta)_0%,var(--gr-cyan-glow)_100%)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_10px_24px_-12px_rgba(192,38,211,0.85)] ring-1 ring-white/10 transition-all hover:scale-[1.03] hover:brightness-110 hover:shadow-[0_0_20px_rgba(34,211,238,0.26),0_0_28px_rgba(192,38,211,0.28)]"
                  style={{ clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)" }}
                >
                  <Rocket className="h-3 w-3" />
                  ლობის გახსნა
                </Link>
              ) : (
                <div className="relative z-[1] pointer-events-none">
                  <Pill tone={isPrimary ? "online" : "cyan"}>
                    {isPrimary ? "მთავარი" : "აქტიური"}
                  </Pill>
                </div>
              )}
            </div>
          </GamerCard>
        );
      })}
    </div>
  );
}
