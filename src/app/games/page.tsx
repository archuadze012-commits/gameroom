import Link from "next/link";
import { Heart, Users as UsersIcon, Radio } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Pill } from "@/components/ui/pill";
import { mockGames, type MockGame } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { FavoriteGameButton } from "@/components/favorite-game-button";

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
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.5))";

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
                <article
                  key={g.slug}
                  className="group relative isolate transition-transform duration-200 hover:-translate-y-1"
                  style={{ background: cardBorder, padding: 1, clipPath: cutLg }}
                >
                  <div className="relative h-64 overflow-hidden bg-[var(--gr-bg-1)] gr-sweep" style={{ clipPath: cutLg }}>
                    {g.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.coverUrl} alt={g.nameKa} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br ${g.accent}`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)] via-[var(--gr-bg-0)]/40 to-transparent" />
                    <Link href={`/games/${g.slug}`} className="absolute inset-0 z-0" aria-label={g.nameKa} />
                    <div className="absolute right-3 top-3 z-10 pointer-events-auto">
                      <FavoriteGameButton slug={g.slug} />
                    </div>
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="font-display text-[18px] font-bold uppercase tracking-tight text-white transition-colors group-hover:text-[var(--gr-violet-hi)]">{g.nameKa}</h3>
                      <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-white/60">{g.players.toLocaleString("en-US")} მოთამაშე</p>
                    </div>
                  </div>
                </article>
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
              <article
                  key={g.slug}
                  className="group relative isolate transition-transform duration-200 hover:-translate-y-1"
                  style={{ background: cardBorder, padding: 1, clipPath: cutLg }}
                >
                  <div
                    className="relative h-64 overflow-hidden bg-[var(--gr-bg-1)] gr-sweep"
                    style={{ clipPath: cutLg }}
                  >
                    {g.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={g.coverUrl}
                        alt={g.nameKa}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br ${g.accent}`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)] via-[var(--gr-bg-0)]/40 to-transparent" />

                    {/* rank badge */}
                    <div className="absolute left-3 top-3">
                      <span
                        className={`grid h-7 w-7 place-items-center text-[12px] font-bold tabular-nums ${rankBg}`}
                        style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)" }}
                      >
                        {i + 1}
                      </span>
                    </div>

                    {/* stretched link behind everything */}
                    <Link href={`/games/${g.slug}`} className="absolute inset-0 z-0" aria-label={g.nameKa} />

                    {/* favourite button — top right, above stretched link */}
                    <div className="absolute right-3 top-3 z-10 pointer-events-auto">
                      <FavoriteGameButton slug={g.slug} />
                    </div>

                    {/* bottom content */}
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-display text-[18px] font-bold uppercase tracking-tight text-white transition-colors group-hover:text-[var(--gr-violet-hi)]">
                            {g.nameKa}
                          </h3>
                          <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-white/60">
                            {g.players.toLocaleString("en-US")} მოთამაშე
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <Pill tone="accent" icon={<Heart className="h-3 w-3 fill-current" />}>
                            {g.favoritedBy}
                          </Pill>
                          <Pill tone="online" icon={<Radio className="h-3 w-3" />}>
                            {g.online}
                          </Pill>
                        </div>
                      </div>
                      {g.liveLfg > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--gr-amber)]">
                          <UsersIcon className="h-3 w-3" />
                          <span className="tabular-nums">{g.liveLfg}</span> ცოცხალი LFG
                        </div>
                      )}
                    </div>
                  </div>
                </article>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}
