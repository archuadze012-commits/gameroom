"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Users, Gamepad2, Download, ShieldCheck, Shield, Trophy, MonitorPlay, Loader2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { mockGames, crackedGames, type CrackedGame } from "@/lib/mock-data";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Pill } from "@/components/ui/pill";
import type { PublicProfile, UserRole } from "@/lib/types";

const neonText = { color: "#ffffff", textShadow: "0 0 4px rgba(196,30,58,0.45), 0 0 10px rgba(196,30,58,0.2)" } as const;
const neonMute = { color: "rgba(255,255,255,0.75)", textShadow: "0 0 3px rgba(196,30,58,0.3), 0 0 8px rgba(196,30,58,0.14)" } as const;
const neonDim  = { color: "rgba(255,255,255,0.55)", textShadow: "0 0 2px rgba(196,30,58,0.22)" } as const;
const neonMagenta = { color: "rgba(196,30,58,0.92)", textShadow: "0 0 4px rgba(196,30,58,0.5), 0 0 10px rgba(196,30,58,0.22)" } as const;

type Tab = "players" | "games" | "cracked";
type RoleFilter = "all" | Exclude<UserRole, "user">;
type DbCrackedGameRow = {
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
  system_reqs: {
    min: { os: string; cpu: string; ram: string; gpu: string; storage: string };
    rec: { os: string; cpu: string; ram: string; gpu: string; storage: string };
  };
  metacritic_score?: number | null;
};

type RoleTone = "neutral" | "live" | "amber" | "violet" | "cyan";

const ROLE_FILTERS: { role: RoleFilter; label: string; icon: React.ReactNode; tone: RoleTone }[] = [
  { role: "all",       label: "ყველა",            icon: <Users className="h-3.5 w-3.5" />,         tone: "neutral" },
  { role: "admin",     label: "ადმინი",            icon: <ShieldCheck className="h-3.5 w-3.5" />,   tone: "live" },
  { role: "moderator", label: "მოდერატორი",        icon: <Shield className="h-3.5 w-3.5" />,        tone: "amber" },
  { role: "organizer", label: "ორგანიზატორი",      icon: <Trophy className="h-3.5 w-3.5" />,        tone: "amber" },
  { role: "streamer",  label: "სტრიმერი",          icon: <MonitorPlay className="h-3.5 w-3.5" />,   tone: "violet" },
  { role: "esports",   label: "კიბერსპორტსმენი",  icon: <Gamepad2 className="h-3.5 w-3.5" />,      tone: "cyan" },
];

function dbRowToCrackedGame(row: DbCrackedGameRow): CrackedGame {
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
    metacriticScore: row.metacritic_score ?? undefined,
  };
}

function SearchPlayerCard({ user }: { user: PublicProfile }) {
  return (
    <div className="player-card-stable relative w-full rounded-[20px] bg-[rgba(15,12,30,0.6)] backdrop-blur-md premium-card-glow-tight transition-all duration-300 p-[2px]">
      <div className="relative z-10 flex min-h-[112px] items-center gap-4 overflow-hidden rounded-[18px] p-4 sm:min-h-[124px] sm:gap-5 sm:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_4%,rgba(7,6,16,0.06)_40%,rgba(7,6,16,0.86)_100%)] z-0" />
        <div className="relative z-[3] shrink-0">
          <div
            style={{
              width: 72, height: 72, borderRadius: "50%",
              border: "2px solid rgba(196,30,58,0.38)",
              boxShadow: "0 0 6px rgba(196,30,58,0.18)",
              overflow: "hidden",
              background: "rgba(196,30,58,0.05)",
              flexShrink: 0,
            }}
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.displayName ?? user.username}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: "#ffffff", textShadow: "0 0 4px rgba(196,30,58,0.4)" }}>
                {(user.displayName ?? user.username).slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--gr-bg-1)]"
            style={{
              backgroundColor: user.isOnline ? "var(--gr-lime)" : "rgba(255,255,255,0.2)",
              boxShadow: user.isOnline ? "0 0 6px var(--gr-lime)" : "none",
            }}
          />
          {user.isVerified && (
            <span className="absolute -top-0.5 -right-0.5 rounded-full p-0.5" style={{ background: "rgba(196,30,58,0.92)", boxShadow: "0 0 4px rgba(196,30,58,0.32)" }}>
              <ShieldCheck className="h-3 w-3 text-white" />
            </span>
          )}
        </div>

        <div className="relative z-[3] min-w-0 flex-1">
          <h4
            className="font-display text-[18px] font-extrabold uppercase leading-tight tracking-tight truncate sm:text-[20px]"
            style={neonText}
          >
            {user.displayName ?? user.username}
          </h4>
          <p className="mt-1 truncate text-[12px] sm:text-[13px]" style={neonMute}>
            @{user.username}
          </p>
          {user.role && user.role !== "user" && (
            <span
              className="mt-2 inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
              style={{
                color: "rgba(196,30,58,0.92)",
                textShadow: "0 0 4px rgba(196,30,58,0.34)",
                border: "1px solid rgba(196,30,58,0.22)",
                borderRadius: 3,
                background: "rgba(196,30,58,0.05)",
              }}
            >
              {user.role}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchMediaCard({
  href,
  title,
  coverUrl,
  accent,
}: {
  href: string;
  title: string;
  coverUrl?: string;
  accent?: string;
}) {
  return (
    <Link href={href} className="group block">
      <div className="relative w-full h-32 rounded-[20px] bg-[rgba(15,12,30,0.8)] backdrop-blur-md premium-card-glow-tight transition-all duration-300 p-[2px]">
        <div className="relative z-10 h-full w-full overflow-hidden rounded-[18px]">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover opacity-95 transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${accent ?? "from-indigo-500/30 to-cyan-500/10"} opacity-30`} />
          )}

          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/6 to-red-600/8 opacity-28" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--gr-bg-0)]/76 via-[var(--gr-bg-0)]/18 to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_4%,rgba(7,6,16,0.06)_40%,rgba(7,6,16,0.86)_100%)] z-0" />

          <div className="absolute bottom-2.5 left-4 right-3 z-10">
            <h4
              className="line-clamp-2 font-display text-[14px] font-extrabold uppercase leading-[1.1] tracking-tight"
              style={neonText}
              title={title}
            >
              {title}
            </h4>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [tab, setTab] = useState<Tab>("players");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [allUsers, setAllUsers] = useState<PublicProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [dbCrackedGames, setDbCrackedGames] = useState<CrackedGame[]>([]);
  const [hiddenCrackedIds, setHiddenCrackedIds] = useState<Set<string>>(new Set());
  const [loadingCrackedGames, setLoadingCrackedGames] = useState(true);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: PublicProfile[]) => setAllUsers(Array.isArray(data) ? data : []))
      .catch(() => setAllUsers([]))
      .finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => {
    fetch("/api/cracked-games", { cache: "no-store" })
      .then((r) => r.json())
      .then((payload: { games?: DbCrackedGameRow[]; hiddenIds?: string[] } | DbCrackedGameRow[]) => {
        const rows = Array.isArray(payload) ? payload : (payload.games ?? []);
        const hiddenIds = Array.isArray(payload) ? [] : (payload.hiddenIds ?? []);
        setDbCrackedGames(rows.map(dbRowToCrackedGame));
        setHiddenCrackedIds(new Set(hiddenIds));
      })
      .catch(() => {
        setDbCrackedGames([]);
        setHiddenCrackedIds(new Set());
      })
      .finally(() => setLoadingCrackedGames(false));
  }, []);

  const q = query.toLowerCase().trim();

  const playerResults = useMemo(() => {
    const byQuery = !q
      ? allUsers
      : allUsers.filter(
          (u) =>
            u.username.toLowerCase().includes(q) ||
            (u.displayName ?? "").toLowerCase().includes(q) ||
            (u.region ?? "").toLowerCase().includes(q),
        );
    return roleFilter === "all" ? byQuery : byQuery.filter((u) => u.role === roleFilter);
  }, [q, roleFilter, allUsers]);

  const gameResults = useMemo(() => {
    if (!q) return mockGames;
    return mockGames.filter(
      (g) =>
        g.nameKa.toLowerCase().includes(q) ||
        g.nameEn.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q),
    );
  }, [q]);

  const allCrackedGames = useMemo(() => {
    const byId = new Map<string, CrackedGame>();
    crackedGames.forEach((game) => byId.set(game.id, game));
    dbCrackedGames.forEach((game) => byId.set(game.id, game));
    return Array.from(byId.values()).filter((game) => !hiddenCrackedIds.has(game.id));
  }, [dbCrackedGames, hiddenCrackedIds]);

  const crackedResults = useMemo(() => {
    if (!q) return allCrackedGames;
    return allCrackedGames.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.genre.some((genre) => genre.toLowerCase().includes(q)) ||
        g.platform.some((p) => p.toLowerCase().includes(q)) ||
        String(g.releaseYear).includes(q),
    );
  }, [allCrackedGames, q]);

  const onlineCount = useMemo(
    () => allUsers.filter((u) => u.isOnline).length,
    [allUsers],
  );

  const roleCounts = useMemo(
    () =>
      Object.fromEntries(
        ROLE_FILTERS.map((f) => [
          f.role,
          f.role === "all"
            ? allUsers.length
            : allUsers.filter((u) => u.role === f.role).length,
        ]),
      ) as Record<RoleFilter, number>,
    [allUsers],
  );

  const tabs = [
    { id: "players" as Tab, label: "მოთამაშეები", icon: <Users className="h-4 w-4" />, count: allUsers.length },
    { id: "games" as Tab, label: "თამაშები", icon: <Gamepad2 className="h-4 w-4" />, count: gameResults.length },
    { id: "cracked" as Tab, label: "PC თამაშები უფასოდ", icon: <Download className="h-4 w-4" />, count: crackedResults.length },
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent overflow-x-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />
      {/* faint light leaks like the home hero */}
      <span aria-hidden className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[var(--gr-violet)]/12 blur-[120px]" />
      <span aria-hidden className="pointer-events-none absolute top-40 -left-20 h-72 w-72 rounded-full bg-[rgba(196,30,58,0.08)] blur-[120px]" />

      <div className="container relative mx-auto px-4 py-10 lg:py-14 space-y-7">
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em]" style={neonMagenta}>ძებნა</p>
          <DisplayHeading as="h1" size="lg" className="mt-3" style={neonText}>ძებნა</DisplayHeading>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed" style={neonMute}>
            იპოვე მოთამაშეები, თამაშები ან PC თამაშები უფასოდ.
          </p>
        </div>

        <div className="relative group">
          <div className={`relative flex items-center overflow-visible rounded-[12px] border border-white/10 bg-[var(--gr-bg-1)] backdrop-blur-md transition-all duration-300 premium-nav-item-glow ${isFocused ? 'premium-nav-item-glow-active shadow-[0_0_20px_rgba(239,68,68,0.2)]' : ''}`}>
            <div className="pl-4 pr-2">
              <Search className={`h-4 w-4 transition-colors duration-300 ${isFocused ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-white/40'}`} />
            </div>
            <Input
              autoFocus
              placeholder="username, თამაში, ჟანრი, პლატფორმა..."
              className="h-12 w-full bg-transparent border-0 px-2 text-base text-white placeholder:text-white/40 shadow-none focus-visible:ring-0"
              style={{ color: "#ffffff", textShadow: "0 0 5px rgba(196,30,58,0.55), 0 0 12px rgba(196,30,58,0.24)" }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-3">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`group relative flex items-center gap-2 overflow-visible rounded-[12px] px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] transition-all duration-300 premium-nav-item-glow ${active ? 'premium-nav-item-glow-active bg-[rgba(15,12,30,0.8)] shadow-[0_0_20px_rgba(236,72,153,0.2)] text-white' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'}`}
              >
                <div className="relative z-10 flex items-center gap-2">
                  {t.icon}
                  {t.label}
                  <Pill tone={active ? "accent" : "neutral"}>{t.count}</Pill>
                </div>
              </button>
            );
          })}
        </div>

      {/* Players */}
      {tab === "players" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#ffffff", textShadow: "0 0 3px rgba(196,30,58,0.28)" }}>
              <span className="relative grid h-2 w-2 place-items-center">
                <span className="absolute inset-0 rounded-full bg-[var(--gr-lime)] opacity-60 motion-safe:animate-ping" />
                <span className="relative h-2 w-2 rounded-full bg-[var(--gr-lime)]" />
              </span>
              ონლაინი — <span style={{ color: "var(--gr-lime)", textShadow: "0 0 8px var(--gr-lime)" }}>{onlineCount}</span>
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {ROLE_FILTERS.map((f) => {
              const isActive = roleFilter === f.role;
              const count = roleCounts[f.role] ?? 0;
              return (
                <button
                  key={f.role}
                  onClick={() => setRoleFilter(f.role)}
                  className={`group relative flex shrink-0 items-center gap-1.5 overflow-visible rounded-[12px] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] transition-all duration-300 premium-nav-item-glow ${isActive ? 'premium-nav-item-glow-active bg-[rgba(15,12,30,0.8)] shadow-[0_0_20px_rgba(236,72,153,0.2)] text-white' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'}`}
                >
                  <div className="relative z-10 flex items-center gap-1.5">
                    {f.icon}
                    {f.label}
                    <span
                      className={`rounded-full px-1.5 text-[10px] tabular-nums ${isActive ? 'bg-[rgba(196,30,58,0.3)] text-white' : 'bg-white/10 text-white/50'}`}
                    >
                      {count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-16 text-[var(--gr-text-mute)]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> იტვირთება...
            </div>
          ) : (
            <>
              <p className="text-[12.5px]" style={neonDim}>
                {q
                  ? `${playerResults.length} შედეგი "${query}"-სთვის`
                  : roleFilter === "all"
                  ? `სულ ${playerResults.length} მოთამაშე`
                  : `${playerResults.length} მოთამაშე`}
              </p>
              {playerResults.length === 0 ? (
                <EmptyResult label="მოთამაშე ვერ მოიძებნა" />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {playerResults.map((user) => (
                    <Link key={user.username} href={`/profile/${user.username}`} className="group block">
                      <SearchPlayerCard user={user} />
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Games */}
      {tab === "games" && (
        <div className="space-y-4">
          <p className="text-[12.5px]" style={neonDim}>
            {q ? `${gameResults.length} შედეგი "${query}"-სთვის` : `სულ ${gameResults.length} თამაში`}
          </p>
          {gameResults.length === 0 ? (
            <EmptyResult label="თამაში ვერ მოიძებნა" />
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {gameResults.map((g) => (
                <SearchMediaCard
                  key={g.slug}
                  href={`/games/${g.slug}`}
                  title={g.nameKa}
                  coverUrl={g.coverUrl}
                  accent={g.accent}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cracked Games */}
      {tab === "cracked" && (
        <div className="space-y-4">
          <p className="text-[12.5px]" style={neonDim}>
            {loadingCrackedGames
              ? "იტვირთება..."
              : q
                ? `${crackedResults.length} შედეგი "${query}"-სთვის`
                : `სულ ${crackedResults.length} თამაში`}
          </p>
          {loadingCrackedGames ? (
            <div className="flex items-center justify-center py-16 text-[var(--gr-text-mute)]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> იტვირთება...
            </div>
          ) : crackedResults.length === 0 ? (
            <EmptyResult label="Cracked game ვერ მოიძებნა" />
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {crackedResults.map((g) => (
                <SearchMediaCard
                  key={g.id}
                  href={`/free-pc-games/${g.id}`}
                  title={g.title}
                  coverUrl={g.coverUrl}
                  accent={g.accent}
                />
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

function EmptyResult({ label }: { label: string }) {
  return (
    <div className="relative w-full overflow-visible rounded-[20px] bg-[rgba(15,12,30,0.8)] py-16 text-center backdrop-blur-md premium-card-glow-tight group">
      <div className="relative z-10">
        <Search className="mx-auto mb-3 h-8 w-8 opacity-70" style={{ color: "#ffffff", filter: "drop-shadow(0 0 6px rgba(196,30,58,0.9))" }} />
        <p className="text-[13.5px]" style={{ color: "rgba(255,255,255,0.75)", textShadow: "0 0 6px rgba(196,30,58,0.7)" }}>{label}</p>
      </div>
    </div>
  );
}
