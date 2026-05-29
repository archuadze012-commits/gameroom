import Link from "next/link";
import { Heart, Users as UsersIcon, Radio } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Pill } from "@/components/ui/pill";
import { mockGames, type MockGame } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { FavoriteGameButton } from "@/components/favorite-game-button";
import { GameCard } from "./game-card";

export const metadata = { title: "თამაშები" };
export const dynamic = "force-dynamic";

type DbGame = {
  slug: string;
  name_ka: string;
  name_en: string;
  description: string;
  accent: string;
  emoji: string;
  icon_url: string | null;
  cover_url: string | null;
};

function dbToGame(g: DbGame): MockGame {
  return {
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
  };
}

const cutLg = "polygon(0 0, calc(100% - 28px) 0, 100% 28px, 100% 100%, 0 100%)";

export default async function GamesCatalogPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: dbGames }, session] = await Promise.all([
    supabase.from("games").select("*"),
    getSession().catch(() => null),
  ]);

  let favSlugs: string[] = [];
  if (session) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("favorite_game_slugs")
      .eq("id", session.id)
      .maybeSingle();
    favSlugs = (profile?.favorite_game_slugs as string[] | null) ?? [];
  }

  const db: MockGame[] = (dbGames ?? []).map(dbToGame);
  const dbSlugs = new Set(db.map((g) => g.slug));
  const combined = [
    ...db,
    ...mockGames.filter((m) => !dbSlugs.has(m.slug)),
  ].sort((a, b) => b.favoritedBy - a.favoritedBy);

  const favGames = combined.filter((g) => favSlugs.includes(g.slug));
  const otherGames = combined.filter((g) => !favSlugs.includes(g.slug));

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto px-4 py-10 lg:py-14">
        <PageHeader
          eyebrow="კატალოგი"
          title="თამაშები"
          description="ყველა მხარდაჭერილი თამაში — შეარჩიე და გაიცანი მისი კომუნიტი."
        />

        {/* ── FAVOURITES ── */}
        {favGames.length > 0 && (
          <div className="mt-10">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gr-text-dim)]">
              ჩემი ფავორიტები
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {favGames.map((g) => (
                <GameCard key={g.slug} clipPath={cutLg}>
                  <div className="relative h-52 overflow-hidden bg-[var(--gr-bg-1)]" style={{ clipPath: cutLg }}>
                    {/* Top Glow Border */}
                    <span aria-hidden className="absolute left-0 top-0 z-10 h-[1.5px] w-full bg-[var(--gr-grad-violet)]" />

                    {/* Game Cover Background */}
                    {g.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={g.coverUrl}
                        alt={g.nameKa}
                        className="absolute inset-0 h-full w-full object-cover opacity-98 transition-transform duration-500 group-hover:opacity-100"
                      />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br ${g.accent} opacity-20`} />
                    )}

                    {/* Ambient Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-cyan-500/5 opacity-40" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--gr-bg-0)]/70 via-[var(--gr-bg-0)]/15 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)]/80 via-[var(--gr-bg-0)]/5 to-transparent" />

                    {/* Atmosphere Circle */}
                    <div aria-hidden className="absolute -left-8 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-white/5 blur-xl transition-transform duration-500 group-hover:scale-125" />

                    {/* Laser lines — instant on/off */}
                    <div aria-hidden className="absolute inset-y-0 left-[7.5%] w-[1px] bg-[var(--gr-violet)]/40 shadow-[0_0_12px_rgba(139,92,246,0.5)] opacity-100 group-hover:opacity-0 duration-0" />
                    <div aria-hidden className="absolute inset-y-0 left-[5.5%] w-[2px] bg-[var(--gr-violet)]/55 shadow-[0_0_15px_rgba(139,92,246,0.6)] opacity-100 group-hover:opacity-0 duration-0" />

                    {/* Colored accent block on the left edge */}
                    <div aria-hidden className="absolute left-0 top-0 h-full w-[6%] bg-[linear-gradient(180deg,rgba(34,211,238,0.9),rgba(139,92,246,0.25))] [clip-path:polygon(0_0,68%_0,100%_100%,0_100%)] opacity-80 group-hover:opacity-0 duration-0" />

                    <Link href={`/games/${g.slug}`} className="absolute inset-0 z-10" aria-label={g.nameKa} />

                    {/* Bottom Details (Game Name) */}
                    <div className="absolute bottom-4 left-[6.5%] right-4 z-20">
                      <h3 className="font-display text-[18px] font-bold uppercase tracking-tight text-white transition-colors group-hover:text-[var(--gr-violet-hi)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                        {g.nameKa}
                      </h3>
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/[0.06] duration-0 z-[5] pointer-events-none" />
                  </div>
                </GameCard>
              ))}
            </div>
            <div className="mt-8 mb-4 h-px bg-[var(--gr-border)]" />
          </div>
        )}

        <div className="mt-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {otherGames.map((g, i) => {
            const rankBg =
              i === 0 ? "bg-[var(--gr-amber)] text-[#1a0e00]" :
              i === 1 ? "bg-[var(--gr-violet-hi)] text-[#0a0014]" :
              i === 2 ? "bg-[var(--gr-magenta)] text-white" :
              "bg-black/60 text-white/80";

            return (
              <GameCard key={g.slug} clipPath={cutLg}>
                  <div
                    className="relative h-52 overflow-hidden bg-[var(--gr-bg-1)]"
                    style={{ clipPath: cutLg }}
                  >
                    {/* Top Glow Border */}
                    <span aria-hidden className="absolute left-0 top-0 z-10 h-[1.5px] w-full bg-[var(--gr-grad-violet)]" />

                    {/* Game Cover Background */}
                    {g.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={g.coverUrl}
                        alt={g.nameKa}
                        className="absolute inset-0 h-full w-full object-cover opacity-98 transition-transform duration-500 group-hover:opacity-100"
                      />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br ${g.accent} opacity-20`} />
                    )}

                    {/* Ambient Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-cyan-500/5 opacity-40" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--gr-bg-0)]/70 via-[var(--gr-bg-0)]/15 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)]/80 via-[var(--gr-bg-0)]/5 to-transparent" />

                    {/* Atmosphere Circle */}
                    <div aria-hidden className="absolute -left-8 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-white/5 blur-xl transition-transform duration-500 group-hover:scale-125" />

                    {/* Laser lines — instant off on hover */}
                    <div aria-hidden className="absolute inset-y-0 left-[7.5%] w-[1px] bg-[var(--gr-violet)]/40 shadow-[0_0_12px_rgba(139,92,246,0.5)] opacity-100 group-hover:opacity-0 duration-0" />
                    <div aria-hidden className="absolute inset-y-0 left-[5.5%] w-[2px] bg-[var(--gr-violet)]/55 shadow-[0_0_15px_rgba(139,92,246,0.6)] opacity-100 group-hover:opacity-0 duration-0" />

                    {/* Colored accent block on the left edge */}
                    <div aria-hidden className="absolute left-0 top-0 h-full w-[6%] bg-[linear-gradient(180deg,rgba(34,211,238,0.9),rgba(139,92,246,0.25))] [clip-path:polygon(0_0,68%_0,100%_100%,0_100%)] opacity-80 group-hover:opacity-0 duration-0" />

                    {/* stretched link behind everything */}
                    <Link href={`/games/${g.slug}`} className="absolute inset-0 z-10" aria-label={g.nameKa} />

                    {/* Bottom Details (Game Name) */}
                    <div className="absolute bottom-4 left-[6.5%] right-4 z-20">
                      <h3 className="font-display text-[18px] font-bold uppercase tracking-tight text-white transition-colors group-hover:text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                        {g.nameKa}
                      </h3>
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/[0.06] duration-0 z-[5] pointer-events-none" />
                  </div>
                </GameCard>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}
