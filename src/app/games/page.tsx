import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { mockGames, type MockGame } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { FavoriteGameButton } from "@/components/favorite-game-button";
import { GameCoverImage } from "@/components/game-cover-image";
import { GameCard } from "./game-card";
import { NonFavoriteGamesGrid } from "./non-favorite-games-grid";
import { CinematicBackground } from "@/components/ui/cinematic-background";

export const metadata = { title: "თამაშები" };

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
    accent: g.accent_color ?? "from-red-500/30 to-red-500/5",
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
    <div className="relative h-64 w-full overflow-hidden">
      
      {/* cover image or fallback */}
      <GameCoverImage
        slug={g.slug}
        name={g.nameKa}
        coverUrl={g.coverUrl}
        accent={g.accent}
        className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-luminosity transition-all duration-700 ease-out group-hover:scale-105 group-hover:opacity-100 group-hover:mix-blend-normal"
      />

      {/* dark gradients for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,12,30,0.95)] via-[rgba(15,12,30,0.4)] to-transparent pointer-events-none" />
      
      {/* ambient color overlay on hover */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] bg-red-500/0 duration-500 group-hover:bg-red-500/10 mix-blend-overlay" />

      {/* game name — bottom left */}
      <div className="absolute bottom-5 left-5 right-5 z-20 flex flex-col justify-end">
        <h3
          className="font-display text-[22px] font-black uppercase tracking-wide text-white drop-shadow-md transition-colors duration-300 group-hover:text-red-300 group-hover:drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]"
        >
          {g.nameKa}
        </h3>
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
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent overflow-hidden">
      
      {/* Cinematic Ambient Background */}
      <div className="absolute inset-0 w-full select-none pointer-events-none mix-blend-screen">
        <CinematicBackground color="red" />
      </div>

      <div className="container relative z-10 mx-auto px-4 py-10 lg:py-14 space-y-12">
        <PageHeader
          color="red"
          eyebrow="კატალოგი"
          title="თამაშები"
          description="ყველა მხარდაჭერილი თამაში — შეარჩიე და გაიცანი მისი კომუნიტი."
        />

        {/* favourites section */}
        {favGames.length > 0 && (
          <div className="mt-8">
            <div className="mb-6 flex items-center gap-4">
              <span className="inline-flex items-center rounded-full border border-red-500/40 bg-red-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] backdrop-blur-md">
                ჩემი ფავორიტები
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-red-500/40 via-red-500/10 to-transparent shadow-[0_0_10px_rgba(239,68,68,0.4)]" />
            </div>
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
          <div className="mb-6 flex items-center gap-4">
            <span className="inline-flex items-center rounded-full border border-red-500/40 bg-red-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] backdrop-blur-md">
              ყველა თამაში
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-red-500/40 via-red-500/10 to-transparent shadow-[0_0_10px_rgba(239,68,68,0.4)]" />
          </div>
          <NonFavoriteGamesGrid games={otherGames} />
        </div>
      </div>
    </div>
  );
}
