"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Users, Gamepad2, Download, ShieldCheck, Shield, Trophy, MonitorPlay, Loader2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { mockGames, crackedGames } from "@/lib/mock-data";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Pill } from "@/components/ui/pill";
import type { PublicProfile, UserRole } from "@/lib/types";
import { GamerCard } from "@/components/ui/gamer-card";

const neonText = { color: "#ffffff", textShadow: "0 0 4px rgba(196,30,58,0.45), 0 0 10px rgba(196,30,58,0.2)" } as const;
const neonMute = { color: "rgba(255,255,255,0.75)", textShadow: "0 0 3px rgba(196,30,58,0.3), 0 0 8px rgba(196,30,58,0.14)" } as const;
const neonDim  = { color: "rgba(255,255,255,0.55)", textShadow: "0 0 2px rgba(196,30,58,0.22)" } as const;
const neonMagenta = { color: "rgba(196,30,58,0.92)", textShadow: "0 0 4px rgba(196,30,58,0.5), 0 0 10px rgba(196,30,58,0.22)" } as const;

type Tab = "players" | "games" | "cracked";
type RoleFilter = "all" | Exclude<UserRole, "user">;

type RoleTone = "neutral" | "live" | "amber" | "violet" | "cyan";

const ROLE_FILTERS: { role: RoleFilter; label: string; icon: React.ReactNode; tone: RoleTone }[] = [
  { role: "all",       label: "ყველა",            icon: <Users className="h-3.5 w-3.5" />,         tone: "neutral" },
  { role: "admin",     label: "ადმინი",            icon: <ShieldCheck className="h-3.5 w-3.5" />,   tone: "live" },
  { role: "moderator", label: "მოდერატორი",        icon: <Shield className="h-3.5 w-3.5" />,        tone: "amber" },
  { role: "organizer", label: "ორგანიზატორი",      icon: <Trophy className="h-3.5 w-3.5" />,        tone: "amber" },
  { role: "streamer",  label: "სტრიმერი",          icon: <MonitorPlay className="h-3.5 w-3.5" />,   tone: "violet" },
  { role: "esports",   label: "კიბერსპორტსმენი",  icon: <Gamepad2 className="h-3.5 w-3.5" />,      tone: "cyan" },
];

function SearchPlayerCard({ user }: { user: PublicProfile }) {
  return (
    <GamerCard clipSize={14} hover sideGlow={false} innerGlow="none" className="transition-transform duration-300 hover:-translate-y-0.5" surfaceClassName="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--gr-bg-1)_96%,black),color-mix(in_srgb,var(--gr-bg-2)_88%,black))]">
      <div className="relative flex min-h-[112px] items-center gap-4 p-4 sm:min-h-[124px] sm:gap-5 sm:p-5">
        <div className="relative z-[3] shrink-0">
          <div
            className="transition-transform duration-300 group-hover:scale-105"
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
    </GamerCard>
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
      <GamerCard clipSize={14} hover sideGlow={false} innerGlow="none" className="h-32 transition-transform duration-300 hover:-translate-y-0.5">
        <div className="relative h-full w-full overflow-hidden">
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
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)]/84 via-[var(--gr-bg-0)]/8 to-transparent" />

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
      </GamerCard>
    </Link>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("players");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [allUsers, setAllUsers] = useState<PublicProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: PublicProfile[]) => setAllUsers(Array.isArray(data) ? data : []))
      .catch(() => setAllUsers([]))
      .finally(() => setLoadingUsers(false));
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

  const crackedResults = useMemo(() => {
    if (!q) return crackedGames;
    return crackedGames.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.genre.some((genre) => genre.toLowerCase().includes(q)) ||
        g.platform.some((p) => p.toLowerCase().includes(q)) ||
        String(g.releaseYear).includes(q),
    );
  }, [q]);

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
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
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

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#ffffff", filter: "drop-shadow(0 0 3px rgba(196,30,58,0.38))" }} />
          <Input
            autoFocus
            placeholder="username, თამაში, ჟანრი, პლატფორმა..."
            className="h-12 bg-[var(--gr-bg-1)] pl-10 text-base text-white placeholder:text-white/40"
            style={{ color: "#ffffff", textShadow: "0 0 5px rgba(196,30,58,0.55), 0 0 12px rgba(196,30,58,0.24)" }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px rgba(196,30,58,0.26), 0 0 8px rgba(196,30,58,0.18)"; e.currentTarget.style.borderColor = "rgba(196,30,58,0.58)"; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = ""; }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Tabs — underline slide */}
        <div className="flex flex-wrap gap-1" style={{ borderBottom: "1px solid rgba(196,30,58,0.2)" }}>
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="relative flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors"
                style={active ? neonText : neonMute}
              >
                {t.icon}
                {t.label}
                <Pill tone={active ? "accent" : "neutral"}>{t.count}</Pill>
                {active && (
                  <span aria-hidden className="absolute inset-x-2 -bottom-px h-[2px]" style={{ background: "rgba(196,30,58,0.92)", boxShadow: "0 0 4px rgba(196,30,58,0.34)" }} />
                )}
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
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {ROLE_FILTERS.map((f) => {
              const isActive = roleFilter === f.role;
              const count = roleCounts[f.role] ?? 0;
              return (
                <button
                  key={f.role}
                  onClick={() => setRoleFilter(f.role)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-all duration-200"
                  style={isActive ? {
                    background: "rgba(196,30,58,0.18)",
                    border: "1px solid rgba(196,30,58,0.7)",
                    boxShadow: "0 0 5px rgba(196,30,58,0.16)",
                    color: "#ffffff",
                    textShadow: "0 0 4px rgba(196,30,58,0.28)",
                  } : {
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.6)",
                    textShadow: "0 0 2px rgba(196,30,58,0.2)",
                  }}
                >
                  {f.icon}
                  {f.label}
                  <span
                    className="rounded-full px-1.5 text-[10px] tabular-nums"
                    style={isActive ? {
                      background: "rgba(196,30,58,0.25)",
                      color: "#ffffff",
                    } : {
                      background: "rgba(255,255,255,0.05)",
                      color: "rgba(255,255,255,0.45)",
                    }}
                  >
                    {count}
                  </span>
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
            {q ? `${crackedResults.length} შედეგი "${query}"-სთვის` : `სულ ${crackedResults.length} cracked game`}
          </p>
          {crackedResults.length === 0 ? (
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
    <div
      className="relative border border-[var(--gr-border-hi)] bg-[var(--gr-bg-1)] py-16 text-center"
      style={{ clipPath: "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)" }}
    >
      <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
      <Search className="mx-auto mb-3 h-8 w-8 opacity-70" style={{ color: "#ffffff", filter: "drop-shadow(0 0 6px rgba(196,30,58,0.9))" }} />
      <p className="text-[13.5px]" style={{ color: "rgba(255,255,255,0.75)", textShadow: "0 0 6px rgba(196,30,58,0.7)" }}>{label}</p>
    </div>
  );
}
