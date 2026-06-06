"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Monitor, Smartphone, Gamepad2 } from "lucide-react";
import { crackedGames, mockGames, type CrackedGame } from "@/lib/mock-data";

function getObjectPosition(url?: string) {
  if (!url) return "center";
  try {
    const parsed = new URL(url, url.startsWith("/") ? "https://example.com" : undefined);
    const y = parsed.searchParams.get("y");
    if (y) {
      const adjustedY = Math.min(100, Math.max(0, Number(y) + 6));
      if (Number.isFinite(adjustedY)) return `center ${adjustedY}%`;
    }
  } catch {}
  return "center 56%";
}

type DbRow = {
  id: string;
  title: string;
  emoji: string;
  cover_url: string | null;
  release_year: number;
  rating: number;
  description: string;
  download_url: string;
  gameplay_url: string | null;
  accent: string;
  genres: string[];
  platforms: string[];
  trending: boolean;
  system_reqs: { min: { os: string; cpu: string; ram: string; gpu: string; storage: string }; rec: { os: string; cpu: string; ram: string; gpu: string; storage: string } };
};

function dbRowToGame(row: DbRow): CrackedGame {
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji,
    coverUrl: row.cover_url ?? undefined,
    releaseYear: row.release_year,
    rating: row.rating,
    description: row.description,
    downloadUrl: row.download_url,
    gameplayUrl: row.gameplay_url ?? undefined,
    accent: row.accent,
    genre: row.genres,
    platform: row.platforms,
    trending: row.trending,
    systemReqs: row.system_reqs,
  };
}

const ALL_GENRES = [
  "ყველა",
  "RPG",
  "Action",
  "Open World",
  "FPS",
  "Battle Royale",
  "Strategy",
  "MOBA",
  "Sandbox",
  "Sports",
  "Racing",
  "Roguelike",
  "Metroidvania",
  "Simulation",
  "Adventure",
  "Party",
  "Hero Shooter",
  "Social Deduction",
];

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  PC: <Monitor className="h-3 w-3" />,
  Mobile: <Smartphone className="h-3 w-3" />,
  PS5: <Gamepad2 className="h-3 w-3" />,
  PS4: <Gamepad2 className="h-3 w-3" />,
  Xbox: <Gamepad2 className="h-3 w-3" />,
  Switch: <Gamepad2 className="h-3 w-3" />,
};

export default function CrackedGamesPage() {
  const [activeGenre, setActiveGenre] = useState("ყველა");
  const [dbGames, setDbGames] = useState<CrackedGame[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [userFavSlugs, setUserFavSlugs] = useState<string[]>([]);
  const [favCounts, setFavCounts] = useState<Record<string, number>>({});
  const [dbRosterGames, setDbRosterGames] = useState<typeof mockGames>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/cracked-games", { cache: "no-store" });
        if (!res.ok) return;
        const payload = await res.json();
        const rows: DbRow[] = payload.games ?? payload;
        setHiddenIds(new Set(payload.hiddenIds ?? []));
        setDbGames(rows.map(dbRowToGame));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();

        const [{ data: gamesData }, { data: profileRows }, myProfile] = await Promise.all([
          supabase.from("games").select("slug, name_ka, emoji, accent_color, icon_url, cover_url"),
          supabase.from("profiles").select("favorite_game_slugs"),
          user ? supabase.from("profiles").select("favorite_game_slugs").eq("id", user.id).single() : Promise.resolve({ data: null }),
        ]);

        const counts: Record<string, number> = {};
        for (const row of profileRows ?? []) {
          for (const slug of (row.favorite_game_slugs as string[] | null) ?? []) {
            counts[slug] = (counts[slug] ?? 0) + 1;
          }
        }
        setFavCounts(counts);
        setUserFavSlugs((myProfile.data?.favorite_game_slugs as string[] | null) ?? []);

        const dbSlugs = new Set((gamesData ?? []).map((g) => g.slug));
        const merged = [
          ...(gamesData ?? []).map((g) => ({
            slug: g.slug, nameKa: g.name_ka, nameEn: g.name_ka,
            description: "", accent: g.accent_color ?? "", emoji: g.emoji ?? "🎮",
            iconUrl: g.icon_url ?? undefined, coverUrl: g.cover_url ?? undefined,
            players: 0, online: 0, liveLfg: 0, favoritedBy: 0,
          })),
          ...mockGames.filter((m) => !dbSlugs.has(m.slug)),
        ];
        setDbRosterGames(merged);
      } catch {}
    })();
  }, []);

  const allGames = useMemo(() => {
    const byId = new Map<string, CrackedGame>();
    crackedGames.forEach((g) => byId.set(g.id, g));
    dbGames.forEach((g) => byId.set(g.id, g));
    return Array.from(byId.values()).filter((g) => !hiddenIds.has(g.id));
  }, [dbGames, hiddenIds]);

  const filtered = useMemo(() => {
    if (activeGenre === "ყველა") return allGames;
    return allGames.filter((g) => g.genre.includes(activeGenre));
  }, [activeGenre, allGames]);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent overflow-hidden">
      {/* Dot grid background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />
      
      <div className="container relative mx-auto px-4 pb-14 lg:pb-24 pt-10 lg:pt-16 space-y-12">
        {/* Header */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-4">
          <h1 className="font-display text-4xl lg:text-5xl font-black uppercase tracking-tight text-[#D0F8FF] drop-shadow-[0_0_10px_rgba(0,230,255,0.5)]">
            PC თამაშები უფასოდ
          </h1>
        </div>

        {/* Genre filter */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
          {ALL_GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setActiveGenre(genre)}
              className={`px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] rounded-full transition-all duration-300 border ${
                activeGenre === genre
                  ? "bg-[#D0F8FF]/20 text-[#D0F8FF] border-[#D0F8FF]/50 shadow-[0_0_15px_rgba(0,230,255,0.4)] drop-shadow-[0_0_6px_rgba(0,230,255,0.35)]"
                  : "bg-white/5 text-[#D0F8FF]/60 border-white/5 hover:bg-[#D0F8FF]/10 hover:text-[#D0F8FF] hover:border-[#D0F8FF]/30"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="space-y-4">
          <div className="flex justify-between items-end px-2 border-b border-white/[0.07] pb-3">
            <h2 className="font-display text-[18px] font-black uppercase tracking-tight text-[var(--gr-text)] drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]">
              {activeGenre === "ყველა" ? "ყველა თამაში" : activeGenre}
            </h2>
            <span className="text-[11px] font-bold text-[var(--gr-text-dim)] uppercase tracking-wider">ნაპოვნია {filtered.length}</span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pubg-card-stage">
            {filtered.map((game, index) => (
              <Link key={game.id} href={`/free-pc-games/${game.id}`} className="block group pubg-loadout-link" data-variant="strike" style={{ "--pubg-card-index": index } as React.CSSProperties}>
                <article className="pubg-loadout-card pubg-loadout-card--free-game !p-0 flex flex-col relative">
                  <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0" />
                  <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5]" />
                  <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-16 w-16 opacity-30 z-0" />
                  <span aria-hidden className="pubg-loadout-sweep absolute inset-y-0 left-0 w-1/3 z-0" />

                  <div className="relative z-[1] aspect-[4/3] w-full overflow-hidden rounded-[16px]">
                    {game.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={game.coverUrl}
                        alt={game.title}
                        className="absolute inset-0 h-full w-full object-cover opacity-70 mix-blend-luminosity transition-all duration-700 group-hover:opacity-100 group-hover:mix-blend-normal"
                        style={{ objectPosition: getObjectPosition(game.coverUrl) }}
                      />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br ${game.accent} opacity-20`} />
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(2,2,4,0.22)_0%,rgba(2,2,4,0.08)_22%,transparent_42%)]" />
                    <div className="absolute left-3 top-3 z-10">
                      <span className="text-[10px] font-black text-[var(--gr-amber)] bg-[var(--gr-amber)]/10 px-2 py-0.5 rounded-full border border-[var(--gr-amber)]/20 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)] flex items-center gap-1">
                        ★ {game.rating}
                      </span>
                    </div>
                    {game.trending && (
                      <div className="absolute right-3 top-3 z-10">
                        <span className="text-[9px] font-black uppercase tracking-wider text-[var(--gr-magenta)] bg-[var(--gr-magenta)]/20 px-2 py-0.5 rounded-full border border-[var(--gr-magenta)]/30">
                          Hot
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 z-10 p-4">
                      <div className="flex flex-col items-start gap-3">
                        <h4 className="font-display text-[15px] font-bold uppercase tracking-tight leading-tight text-[var(--gr-text)] drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] transition-all duration-300 group-hover:text-[var(--gr-magenta)]">
                          {game.title}
                        </h4>

                        <div className="flex flex-wrap gap-1.5">
                          {game.genre.slice(0, 2).map((g) => (
                            <span key={g} className="rounded-full border border-black bg-black/80 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#D0F8FF]/90 shadow-[inset_0_0_0_1px_rgba(0,230,255,0.3),0_0_14px_rgba(0,230,255,0.15)] transition-all duration-300 group-hover:border-[#D0F8FF]/70 group-hover:text-white group-hover:shadow-[inset_0_0_0_1px_rgba(0,230,255,0.6),0_0_18px_rgba(0,230,255,0.3)]">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
