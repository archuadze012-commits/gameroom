import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { mockGames, type MockGame } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { FavoriteGameButton } from "@/components/favorite-game-button";
import { GameCard } from "./game-card";
import { NonFavoriteGamesGrid } from "./non-favorite-games-grid";

export const metadata = { title: "თამაშები" };
export const dynamic = "force-dynamic";

type DbGame = {
  slug: string;
  name_ka: string;
  name_en: string;
  description: string | null;
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
    description: g.description ?? "",
    accent: g.accent_color ?? "from-violet-500/30 to-violet-500/5",
    emoji: g.emoji ?? "🎮",
    iconUrl: g.icon_url ?? undefined,
    coverUrl: g.cover_url ?? undefined,
    players: 0,
    online: 0,
    liveLfg: 0,
    favoritedBy: 0,
  };
}

function GameCardInner({ g }: { g: MockGame }) {
  return (
    <div className="relative h-64 overflow-hidden rounded-[20px]">
      
      {/* cover image or fallback */}
      {g.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={g.coverUrl}
          alt={g.nameKa}
          className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-luminosity transition-all duration-700 ease-out group-hover:scale-105 group-hover:opacity-100 group-hover:mix-blend-normal"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${g.accent} opacity-20`} />
      )}

      {/* dark gradients for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,12,30,0.95)] via-[rgba(15,12,30,0.4)] to-transparent pointer-events-none" />
      
      {/* ambient color overlay on hover */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] bg-violet-500/0 duration-500 group-hover:bg-violet-500/10 mix-blend-overlay" />

      {/* game name — bottom left */}
      <div className="absolute bottom-5 left-5 right-5 z-20 flex flex-col justify-end">
        <h3
          className="font-display text-[22px] font-black uppercase tracking-wide text-white drop-shadow-md transition-colors duration-300 group-hover:text-violet-300 group-hover:drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]"
        >
          {g.nameKa}
        </h3>
        {g.emoji && <span className="text-xl mt-1 opacity-80">{g.emoji}</span>}
      </div>

      {/* favorite button — top right, always visible */}
      <div className="absolute right-4 top-4 z-30">
        <FavoriteGameButton slug={g.slug} />
      </div>

      {/* stretched link */}
      <Link href={`/games/${g.slug}`} className="absolute inset-0 z-20" aria-label={g.nameKa} />
    </div>
  );
}

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
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)] overflow-hidden">
      
      {/* Cinematic Ambient Background */}
      <div className="absolute inset-x-0 top-0 h-[600px] w-full select-none pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.1),transparent_50%)] mix-blend-screen" />
        <div className="absolute top-0 inset-x-0 h-[200px] bg-gradient-to-b from-[rgba(15,12,30,0.8)] to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-[300px] bg-gradient-to-t from-[var(--gr-bg-0)] to-transparent" />
      </div>

      <div className="container relative z-10 mx-auto px-4 py-10 lg:py-14 space-y-12">
        <PageHeader
          eyebrow="კატალოგი"
          title="თამაშები"
          description="ყველა მხარდაჭერილი თამაში — შეარჩიე და გაიცანი მისი კომუნიტი."
        />

        {/* favourites section */}
        {favGames.length > 0 && (
          <div className="mt-8">
            <p className="mb-5 text-[12px] font-black uppercase tracking-[0.2em] text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]">
              ჩემი ფავორიტები
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {favGames.map((g) => (
                <GameCard key={g.slug}>
                  <GameCardInner g={g} />
                </GameCard>
              ))}
            </div>
            
            <div className="my-10 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        )}

        <div className="mt-8">
          <p className="mb-5 text-[12px] font-black uppercase tracking-[0.2em] text-violet-400 drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]">
            ყველა თამაში
          </p>
          <NonFavoriteGamesGrid games={otherGames} />
        </div>
      </div>
    </div>
  );
}
