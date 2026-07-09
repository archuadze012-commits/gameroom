import { PageHeader } from "@/components/page-header";
import { mockGames, type MockGame } from "@/lib/mock-data";
import { createSupabaseAdminClientOrNull } from "@/lib/supabase/admin";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { GamesCatalog } from "./games-catalog";

export const metadata = {
  title: "თამაშები",
  description: "აღმოაჩინე შენი საყვარელი თამაშები — ლობი, ჩემპიონატები, გუნდები და შოპი PLAYGAME.GE-ზე.",
  alternates: { canonical: "/games" },
  openGraph: {
    title: "თამაშები · PLAYGAME.GE",
    description: "აღმოაჩინე შენი საყვარელი თამაშები PLAYGAME.GE-ზე.",
    url: "/games",
    type: "website",
  },
};

// The games catalog is identical for every visitor — the per-user "favorites"
// split is layered on client-side (see GamesCatalog). That lets this page render
// without a per-request session/cookie read, so it can be served from the CDN
// via ISR instead of a full server round-trip on every navigation. A cookie-free
// admin client reads the public games table.
export const revalidate = 300;

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

export default async function GamesCatalogPage() {
  // Falls back to the built-in mockGames catalog if admin env is missing (e.g. a
  // preview build); production build/runtime reads the live games table.
  const supabase = createSupabaseAdminClientOrNull();
  const { data: dbGames } = supabase
    ? await supabase.from("games").select("*")
    : { data: null };

  const db: MockGame[] = (dbGames ?? []).map(dbToGame);
  const dbSlugs = new Set(db.map((g) => g.slug));
  const combined = [
    ...db,
    ...mockGames.filter((m) => !dbSlugs.has(m.slug)),
  ].sort((a, b) => b.favoritedBy - a.favoritedBy);

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

        <GamesCatalog games={combined} />
      </div>
    </div>
  );
}
