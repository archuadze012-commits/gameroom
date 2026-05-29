import Link from "next/link";
import { Rocket } from "lucide-react";
import { mockGames, type MockGame } from "@/lib/mock-data";
import { GameIcon } from "@/components/game-icon";
import { Pill } from "@/components/ui/pill";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const cutSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";

const LOBBY_GAMES = new Set<string>(["pubg-mobile"]);

export async function ProfileGameRows({ slugs, username }: { slugs: string[]; username: string }) {
  if (slugs.length === 0) {
    return (
      <p
        className="border border-dashed border-[var(--gr-border-hi)] bg-[var(--gr-bg-2)]/40 py-8 text-center text-[13px] text-[var(--gr-text-mute)]"
        style={{ clipPath: cutSm }}
      >
        ჯერ არცერთი თამაში არ არის არჩეული.
      </p>
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: dbGames } = await supabase
    .from("games")
    .select("slug, name_ka, name_en, description, accent, emoji, icon_url, cover_url")
    .in("slug", slugs);

  const dbMap = new Map<string, MockGame>(
    (dbGames ?? []).map((g) => [
      g.slug,
      {
        slug: g.slug,
        nameKa: g.name_ka,
        nameEn: g.name_en,
        description: g.description,
        accent: g.accent,
        emoji: g.emoji,
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
      <p
        className="border border-dashed border-[var(--gr-border-hi)] bg-[var(--gr-bg-2)]/40 py-8 text-center text-[13px] text-[var(--gr-text-mute)]"
        style={{ clipPath: cutSm }}
      >
        ჯერ არცერთი თამაში არ არის არჩეული.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {games.map((g, i) => {
        const isPrimary = i === 0;
        const hasLobby = LOBBY_GAMES.has(g.slug);
        return (
          <div
            key={g.slug}
            className="group relative flex items-center gap-3 bg-[var(--gr-bg-1)] p-3 ring-1 ring-[var(--gr-border)] transition-all duration-200 hover:-translate-y-0.5 hover:ring-[var(--gr-violet-hi)] gr-sweep"
            style={{ clipPath: cutSm }}
          >
            <Link
              href={`/games/${g.slug}`}
              aria-label={g.nameKa}
              className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gr-violet-hi)]"
            />

            <div className="relative z-[1] grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-[var(--gr-bg-2)] ring-1 ring-[var(--gr-border)]">
              <GameIcon game={g} size="sm" />
            </div>
            <div className="relative z-[1] min-w-0 flex-1 pointer-events-none">
              <div className="truncate font-display text-[14px] font-bold uppercase tracking-tight text-[var(--gr-text)] group-hover:text-[var(--gr-violet-hi)]">
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
                className="relative z-[2] inline-flex items-center gap-1.5 bg-[var(--gr-grad-violet)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_4px_14px_-4px_rgba(139,92,246,0.7)] transition-all hover:scale-[1.03] hover:shadow-[0_0_18px_rgba(192,38,211,0.6)]"
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
        );
      })}
    </div>
  );
}
