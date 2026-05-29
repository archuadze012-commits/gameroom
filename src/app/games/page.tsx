import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { mockGames, type MockGame } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  accent_color?: string | null;
  emoji: string | null;
  icon_url: string | null;
  cover_url: string | null;
};

function dbToGame(g: DbGame): MockGame {
  return {
    slug: g.slug,
    nameKa: g.name_ka,
    nameEn: g.name_en,
    description: g.description,
    accent: g.accent_color ?? "from-indigo-500/30 to-indigo-500/5",
    emoji: g.emoji ?? "🎮",
    iconUrl: g.icon_url ?? undefined,
    coverUrl: g.cover_url ?? undefined,
    players: 0,
    online: 0,
    liveLfg: 0,
    favoritedBy: 0,
  };
}

const cutLg = "polygon(0 0, calc(100% - 28px) 0, 100% 28px, 100% 100%, 0 100%)";

function GameCardInner({ g }: { g: MockGame }) {
  return (
    <div className="relative h-52 overflow-hidden bg-[var(--gr-bg-1)]" style={{ clipPath: cutLg }}>
      {/* top violet glow line */}
      <span aria-hidden className="absolute left-0 top-0 z-10 h-[1.5px] w-full bg-[var(--gr-grad-violet)]" />

      {/* cover image or fallback */}
      {g.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={g.coverUrl}
          alt={g.nameKa}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${g.accent} opacity-20`} />
      )}

      {/* dark gradients for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--gr-bg-0)]/70 via-[var(--gr-bg-0)]/10 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)]/85 via-transparent to-transparent" />

      {/* magenta overlay on hover — instant */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] bg-fuchsia-600/0 duration-0 group-hover:bg-fuchsia-600/[0.08]" />

      {/* white laser sweep on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-10 h-[2px] w-full translate-x-[-100%] opacity-0
                   group-hover:translate-x-[100%] group-hover:opacity-100
                   group-hover:transition-transform group-hover:duration-700"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.8),transparent)" }}
      />

      {/* game name — bottom left */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex items-end justify-between gap-2">
        <h3
          className="font-display text-[18px] font-bold uppercase tracking-tight duration-0"
          style={{ color: "#ffffff", textShadow: "0 0 8px rgba(236,72,153,0.9), 0 0 20px rgba(236,72,153,0.55), 0 0 36px rgba(236,72,153,0.3)" }}
        >
          {g.nameKa}
        </h3>
      </div>

      {/* favorite button — top right, visible on hover */}
      <div className="absolute right-3 top-3 z-30 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <FavoriteGameButton slug={g.slug} />
      </div>

      {/* stretched link */}
      <Link href={`/games/${g.slug}`} className="absolute inset-0 z-20" aria-label={g.nameKa} />
    </div>
  );
}

export default async function GamesCatalogPage() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const [{ data: dbGames }, session] = await Promise.all([
    admin.from("games").select("*"),
    getSession().catch(() => null),
  ]);

  let favSlugs: string[] = [];
  if (session) {
    const { data: profile } = await admin
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

        {/* favourites section */}
        {favGames.length > 0 && (
          <div className="mt-10">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(236,72,153,1)", textShadow: "0 0 8px rgba(236,72,153,1), 0 0 18px rgba(236,72,153,0.7)" }}>
              ჩემი ფავორიტები
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {favGames.map((g) => (
                <GameCard key={g.slug}>
                  <GameCardInner g={g} />
                </GameCard>
              ))}
            </div>
            <div className="mb-4 mt-8 h-px bg-[var(--gr-border)]" />
          </div>
        )}

        <div className="mt-10">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {otherGames.map((g) => (
              <GameCard key={g.slug}>
                <GameCardInner g={g} />
              </GameCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
