"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Monitor, Smartphone, Gamepad2, ChevronDown, Search } from "lucide-react";
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

const GENRE_KA_MAP: Record<string, string> = {
  "ყველა": "ყველა",
  "rpg": "როლური",
  "action": "ეკშენი",
  "open world": "ღია სამყარო",
  "fps": "პირველი პირი",
  "1st person": "პირველი პირი",
  "first person": "პირველი პირი",
  "third person": "მესამე პირი",
  "3rd person": "მესამე პირი",
  "battle royale": "ბეთლ როიალი",
  "strategy": "სტრატეგია",
  "moba": "MOBA",
  "sandbox": "სენდბოქსი",
  "sports": "სპორტი",
  "racing": "რბოლა",
  "roguelike": "როგლაიქი",
  "roguelite": "როგლაიქი",
  "metroidvania": "მეტროიდვანია",
  "simulation": "სიმულაცია",
  "adventure": "თავგადასავალი",
  "party": "პარტი",
  "hero shooter": "ჰირო შუთერი",
  "social deduction": "სოციალური",
  "survival": "გადარჩენა",
  "horror": "საშინელება",
  "stealth": "სტელსი",
  "platformer": "პლატფორმერი",
  "fighting": "ჩხუბი",
  "puzzle": "პაზლი",
  "shooter": "შუთერი",
  "mmo": "MMO",
  "mmorpg": "MMORPG",
  "tactical": "ტაქტიკური",
};

function genreKa(g: string): string {
  return GENRE_KA_MAP[g.toLowerCase()] ?? g;
}

const GENRE_KA: Record<string, string> = Object.fromEntries(
  Object.entries(GENRE_KA_MAP).map(([k, v]) => [k, v])
);

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerRect, setPickerRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [genreSearch, setGenreSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const genreBtnRef = useRef<HTMLButtonElement>(null);
  const [dbGames, setDbGames] = useState<CrackedGame[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [userFavSlugs, setUserFavSlugs] = useState<string[]>([]);
  const [favCounts, setFavCounts] = useState<Record<string, number>>({});
  const [dbRosterGames, setDbRosterGames] = useState<typeof mockGames>([]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!pickerOpen) return;
    const close = (e: MouseEvent) => {
      if (genreBtnRef.current && !genreBtnRef.current.contains(e.target as Node)) {
        const panel = document.getElementById("genre-picker-panel");
        if (panel && panel.contains(e.target as Node)) return;
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [pickerOpen]);

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

        {/* Genre picker */}
        <div className="flex justify-center">
          <button
            type="button"
            ref={genreBtnRef}
            onClick={() => {
              if (!pickerOpen && genreBtnRef.current) {
                const rect = genreBtnRef.current.getBoundingClientRect();
                setPickerRect({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 220) });
              }
              setPickerOpen((v) => !v);
            }}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[#D0F8FF]/80 transition-colors hover:border-[#D0F8FF]/40 hover:text-[#D0F8FF] min-w-[220px] justify-between"
          >
            <span className="font-semibold">
              {activeGenre === "ყველა" ? <span className="text-white/50">ჟანრი</span> : genreKa(activeGenre)}
            </span>
            <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {mounted && pickerOpen && pickerRect && createPortal(
          <div
            id="genre-picker-panel"
            className="fixed z-[9999] rounded-xl border border-white/10 bg-[#0a0714] shadow-2xl overflow-hidden"
            style={{ top: pickerRect.top, left: pickerRect.left, width: pickerRect.width }}
          >
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 bg-[#0a0714]">
              <Search className="h-3.5 w-3.5 text-white/40" />
              <input
                autoFocus
                value={genreSearch}
                onChange={e => setGenreSearch(e.target.value)}
                placeholder="ძებნა..."
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
            </div>
            <div className="max-h-52 overflow-y-auto py-1 bg-[#0a0714] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
              {ALL_GENRES.filter(g => (genreKa(g)).toLowerCase().includes(genreSearch.toLowerCase())).map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => { setActiveGenre(genre); setPickerOpen(false); setGenreSearch(""); }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-white/5 ${activeGenre === genre ? "text-[#D0F8FF]" : "text-white/60"}`}
                >
                  {genreKa(genre)}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}

        {/* Grid */}
        <div className="space-y-4">
          <div className="flex justify-between items-end px-2 border-b border-white/[0.07] pb-3">
            <h2 className="font-display text-[18px] font-black uppercase tracking-tight text-[var(--gr-text)] drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]">
              {activeGenre === "ყველა" ? "ყველა თამაში" : genreKa(activeGenre)}
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
                              {genreKa(g)}
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
