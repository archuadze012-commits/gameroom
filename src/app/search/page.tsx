"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Users, Gamepad2, Download, Star, ShieldCheck, Shield, Trophy, MonitorPlay, Loader2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { mockGames, crackedGames } from "@/lib/mock-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GameIcon } from "@/components/game-icon";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Pill } from "@/components/ui/pill";
import type { PublicProfile, UserRole } from "@/lib/types";

type Tab = "players" | "games" | "cracked";
type RoleFilter = "all" | Exclude<UserRole, "user">;

const cutSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.55))";

type RoleTone = "neutral" | "live" | "amber" | "violet" | "cyan";

const ROLE_FILTERS: { role: RoleFilter; label: string; icon: React.ReactNode; tone: RoleTone }[] = [
  { role: "all",       label: "ყველა",            icon: <Users className="h-3.5 w-3.5" />,         tone: "neutral" },
  { role: "admin",     label: "ადმინი",            icon: <ShieldCheck className="h-3.5 w-3.5" />,   tone: "live" },
  { role: "moderator", label: "მოდერატორი",        icon: <Shield className="h-3.5 w-3.5" />,        tone: "amber" },
  { role: "organizer", label: "ორგანიზატორი",      icon: <Trophy className="h-3.5 w-3.5" />,        tone: "amber" },
  { role: "streamer",  label: "სტრიმერი",          icon: <MonitorPlay className="h-3.5 w-3.5" />,   tone: "violet" },
  { role: "esports",   label: "კიბერსპორტსმენი",  icon: <Gamepad2 className="h-3.5 w-3.5" />,      tone: "cyan" },
];

const TONE_ACTIVE: Record<RoleTone, string> = {
  neutral: "bg-[var(--gr-violet)]/14 text-[var(--gr-text)] ring-1 ring-[var(--gr-violet-hi)]/60",
  live:    "bg-[color-mix(in_oklab,var(--gr-amber)_20%,transparent)] text-[var(--gr-amber)] ring-1 ring-[color-mix(in_oklab,var(--gr-amber)_55%,transparent)]",
  amber:   "bg-[color-mix(in_oklab,var(--gr-amber)_18%,transparent)] text-[var(--gr-amber)] ring-1 ring-[color-mix(in_oklab,var(--gr-amber)_50%,transparent)]",
  violet:  "bg-[color-mix(in_oklab,var(--gr-violet)_18%,transparent)] text-[var(--gr-violet-hi)] ring-1 ring-[color-mix(in_oklab,var(--gr-violet)_55%,transparent)]",
  cyan:    "bg-[color-mix(in_oklab,var(--gr-cyan-glow)_15%,transparent)] text-[var(--gr-cyan-glow)] ring-1 ring-[color-mix(in_oklab,var(--gr-cyan-glow)_45%,transparent)]",
};

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
      <span aria-hidden className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[var(--gr-violet)]/20 blur-[120px]" />
      <span aria-hidden className="pointer-events-none absolute top-40 -left-20 h-72 w-72 rounded-full bg-[var(--gr-magenta)]/15 blur-[120px]" />

      <div className="container relative mx-auto px-4 py-10 lg:py-14 space-y-7">
        <div>
          <Eyebrow tone="amber">ძებნა</Eyebrow>
          <DisplayHeading as="h1" size="lg" className="mt-3">ძებნა</DisplayHeading>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--gr-text-mute)]">
            იპოვე მოთამაშეები, თამაშები ან PC თამაშები უფასოდ.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gr-text-mute)]" />
          <Input
            autoFocus
            placeholder="username, თამაში, ჟანრი, პლატფორმა..."
            className="pl-10 h-12 text-base border-[var(--gr-border-hi)] bg-[var(--gr-bg-1)]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Tabs — underline slide */}
        <div className="flex flex-wrap gap-1 border-b border-[var(--gr-border)]">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                  active ? "text-[var(--gr-text)]" : "text-[var(--gr-text-mute)] hover:text-[var(--gr-text)]"
                }`}
              >
                {t.icon}
                {t.label}
                <Pill tone={active ? "accent" : "neutral"}>{t.count}</Pill>
                {active && (
                  <span aria-hidden className="absolute inset-x-2 -bottom-px h-[2px] bg-[var(--gr-violet)] shadow-[0_0_10px_rgba(139,92,246,0.6)]" />
                )}
              </button>
            );
          })}
        </div>

      {/* Players */}
      {tab === "players" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--gr-text-mute)]">
              <span className="relative grid h-2 w-2 place-items-center">
                <span className="absolute inset-0 rounded-full bg-[var(--gr-lime)] opacity-60 motion-safe:animate-ping" />
                <span className="relative h-2 w-2 rounded-full bg-[var(--gr-lime)]" />
              </span>
              ონლაინი — <span className="text-[var(--gr-lime)]">{onlineCount}</span>
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
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                    isActive
                      ? TONE_ACTIVE[f.tone]
                      : "bg-[var(--gr-bg-1)] text-[var(--gr-text-mute)] ring-1 ring-[var(--gr-border)] hover:text-[var(--gr-text)] hover:ring-[var(--gr-border-hi)]"
                  }`}
                >
                  {f.icon}
                  {f.label}
                  <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${isActive ? "bg-white/10" : "bg-white/[0.04] text-[var(--gr-text-dim)]"}`}>
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
              <p className="text-[12.5px] text-[var(--gr-text-mute)]">
                {q
                  ? `${playerResults.length} შედეგი "${query}"-სთვის`
                  : roleFilter === "all"
                  ? `სულ ${playerResults.length} მოთამაშე`
                  : `${playerResults.length} მოთამაშე`}
              </p>
              {playerResults.length === 0 ? (
                <EmptyResult label="მოთამაშე ვერ მოიძებნა" />
              ) : (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {playerResults.map((user) => (
                    <Link key={user.username} href={`/profile/${user.username}`} className="group block">
                      <article
                        className="relative isolate h-32 overflow-hidden transition-all duration-300"
                        style={{ background: cardBorder, padding: 1, clipPath: cutSm }}
                      >
                        <div
                          className="relative h-full w-full bg-[var(--gr-bg-1)] transition-transform duration-300"
                          style={{ clipPath: cutSm }}
                        >
                          {/* Top Border Glow */}
                          <span aria-hidden className="absolute left-0 top-0 z-10 h-[1.5px] w-full bg-[var(--gr-grad-violet)]" />

                          {/* Accent Backgrounds */}
                          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/15 to-cyan-500/5 opacity-80" />
                          <div className="absolute inset-0 bg-gradient-to-r from-[var(--gr-bg-0)] via-[var(--gr-bg-0)]/30 to-transparent" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)] via-[var(--gr-bg-0)]/25 to-transparent" />

                          {/* Atmosphere Circle */}
                          <div aria-hidden className="absolute -left-8 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-white/5 blur-xl transition-transform duration-500 group-hover:scale-125" />

                          {/* Laser lines left */}
                          <div aria-hidden className="absolute inset-y-0 left-[22%] w-[1px] bg-[var(--gr-violet)]/40 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                          <div aria-hidden className="absolute inset-y-0 left-[18%] w-[2px] bg-[var(--gr-violet)]/55 shadow-[0_0_15px_rgba(139,92,246,0.6)]" />

                          {/* Colored accent block on the left edge */}
                          <div aria-hidden className="absolute left-0 top-0 h-full w-[18%] bg-[linear-gradient(180deg,rgba(34,211,238,0.9),rgba(139,92,246,0.25))] [clip-path:polygon(0_0,68%_0,100%_100%,0_100%)] opacity-80" />

                          {/* Floating Avatar Circular Container on the left panel */}
                          <div className="absolute inset-y-0 left-[10%] z-[1] flex items-center justify-center">
                            <div className="relative">
                              <div className="rounded-full border border-white/12 bg-white/[0.04] p-1 shadow-[0_0_20px_rgba(139,92,246,0.25)] backdrop-blur-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                                <div className="h-18 w-18 overflow-hidden rounded-full border border-white/10">
                                  {user.avatarUrl ? (
                                    <img
                                      src={user.avatarUrl}
                                      alt={user.displayName ?? user.username}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-[var(--gr-violet)]/20 text-2xl font-black text-[var(--gr-violet-hi)]">
                                      {(user.displayName ?? user.username).slice(0, 1).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {user.isVerified && (
                                <span className="absolute -bottom-1 -right-1 rounded-full bg-[var(--gr-bg-1)] p-0.5 shadow ring-1 ring-[var(--gr-border-hi)]">
                                  <ShieldCheck className="h-4 w-4 text-[var(--gr-violet-hi)] fill-[var(--gr-violet-hi)]/20" />
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Top Details (Online Status Pill & Role Badge) */}
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                            <span 
                              className="h-2 w-2 rounded-full shadow-[0_0_6px_rgba(34,197,94,0.6)] shrink-0 animate-pulse" 
                              style={{ backgroundColor: user.isOnline ? "var(--gr-lime)" : "var(--gr-amber)" }}
                            />
                            {user.role && user.role !== "user" && (
                              <span className="text-[9px] font-black tracking-wider uppercase text-[var(--gr-text-mute)] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                                {user.role}
                              </span>
                            )}
                          </div>

                          {/* Center Details next to avatar (Display Name only, no @username) */}
                          <div className="absolute top-1/2 -translate-y-1/2 left-[33%] right-3.5 z-10 text-center">
                            <h4 className="font-display text-[19px] font-extrabold uppercase leading-[1.2] tracking-tight text-[var(--gr-text)] drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.6)] group-hover:text-[var(--gr-violet-hi)] transition-colors line-clamp-2">
                              {user.displayName ?? user.username}
                            </h4>
                          </div>

                          {/* Hover Effects (Button Style) */}
                          <div className="absolute inset-0 bg-gr-magenta opacity-0 transition-opacity group-hover:opacity-[0.04] z-[5] pointer-events-none" />
                          <div className="absolute inset-0 bg-gradient-to-br from-gr-magenta/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-[5] pointer-events-none" />
                          <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-700 z-[5] pointer-events-none" />
                        </div>

                      </article>
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
          <p className="text-[12.5px] text-[var(--gr-text-mute)]">
            {q ? `${gameResults.length} შედეგი "${query}"-სთვის` : `სულ ${gameResults.length} თამაში`}
          </p>
          {gameResults.length === 0 ? (
            <EmptyResult label="თამაში ვერ მოიძებნა" />
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {gameResults.map((g) => (
                <Link key={g.slug} href={`/games/${g.slug}`} className="group block">
                  <article
                    className="group relative isolate h-32 overflow-hidden transition-all duration-300 group-hover:[--card-border-hover:rgba(220,38,38,0.8)]"
                    style={{ background: 'var(--card-border-hover, ' + cardBorder + ')', padding: 1, clipPath: cutSm }}
                  >
                    <div
                      className="relative h-full w-full bg-[var(--gr-bg-1)] transition-transform duration-300"
                      style={{ clipPath: cutSm }}
                    >
                      {/* Top Border Glow */}
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

                      {/* Laser lines left */}
                      <div aria-hidden className="absolute inset-y-0 left-[7.5%] w-[1px] bg-[var(--gr-violet)]/40 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                      <div aria-hidden className="absolute inset-y-0 left-[5.5%] w-[2px] bg-[var(--gr-violet)]/55 shadow-[0_0_15px_rgba(139,92,246,0.6)]" />

                      {/* Colored accent block on the left edge */}
                      <div aria-hidden className="absolute left-0 top-0 h-full w-[6%] bg-[linear-gradient(180deg,rgba(34,211,238,0.9),rgba(139,92,246,0.25))] [clip-path:polygon(0_0,68%_0,100%_100%,0_100%)] opacity-80" />

                      {/* Bottom Details (Game Name) */}
                      <div className="absolute bottom-2.5 left-[6.5%] right-2.5 z-10">
                        <h4 className="font-display text-[14px] font-extrabold uppercase leading-[1.1] tracking-tight text-[var(--gr-text)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] group-hover:text-[var(--gr-violet-hi)] transition-colors line-clamp-2">
                          {g.nameKa}
                        </h4>
                      </div>

                      {/* Hover Effects (Button Style) */}
                      <div className="absolute inset-0 bg-gr-magenta opacity-0 transition-opacity group-hover:opacity-[0.04] z-[5] pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-br from-gr-magenta/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-[5] pointer-events-none" />
                      <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-700 z-[5] pointer-events-none" />
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cracked Games */}
      {tab === "cracked" && (
        <div className="space-y-4">
          <p className="text-[12.5px] text-[var(--gr-text-mute)]">
            {q ? `${crackedResults.length} შედეგი "${query}"-სთვის` : `სულ ${crackedResults.length} cracked game`}
          </p>
          {crackedResults.length === 0 ? (
            <EmptyResult label="Cracked game ვერ მოიძებნა" />
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {crackedResults.map((g) => (
                <Link key={g.id} href={`/free-pc-games/${g.id}`} className="group block">
                  <article
                    className="group relative isolate h-32 overflow-hidden transition-all duration-300 group-hover:[--card-border-hover:rgba(220,38,38,0.8)]"
                    style={{ background: 'var(--card-border-hover, ' + cardBorder + ')', padding: 1, clipPath: cutSm }}
                  >
                    <div
                      className="relative h-full w-full bg-[var(--gr-bg-1)] transition-transform duration-300"
                      style={{ clipPath: cutSm }}
                    >
                      {/* Top Border Glow */}
                      <span aria-hidden className="absolute left-0 top-0 z-10 h-[1.5px] w-full bg-[var(--gr-grad-violet)]" />

                      {/* Game Cover Background */}
                      {g.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={g.coverUrl}
                          alt={g.title}
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

                      {/* Laser lines left */}
                      <div aria-hidden className="absolute inset-y-0 left-[7.5%] w-[1px] bg-[var(--gr-violet)]/40 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                      <div aria-hidden className="absolute inset-y-0 left-[5.5%] w-[2px] bg-[var(--gr-violet)]/55 shadow-[0_0_15px_rgba(139,92,246,0.6)]" />

                      {/* Colored accent block on the left edge */}
                      <div aria-hidden className="absolute left-0 top-0 h-full w-[6%] bg-[linear-gradient(180deg,rgba(34,211,238,0.9),rgba(139,92,246,0.25))] [clip-path:polygon(0_0,68%_0,100%_100%,0_100%)] opacity-80" />

                      {/* Bottom Details (Title) */}
                      <div className="absolute bottom-2.5 left-[6.5%] right-2.5 z-10">
                        <h4 className="font-display text-[13px] font-extrabold uppercase leading-[1.1] tracking-tight text-[var(--gr-text)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] group-hover:text-[var(--gr-violet-hi)] transition-colors line-clamp-2" title={g.title}>
                          {g.title}
                        </h4>
                      </div>

                      {/* Hover Effects (Button Style) */}
                      <div className="absolute inset-0 bg-gr-magenta opacity-0 transition-opacity group-hover:opacity-[0.04] z-[5] pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-br from-gr-magenta/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-[5] pointer-events-none" />
                      <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-700 z-[5] pointer-events-none" />
                    </div>
                  </article>
                </Link>
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
      <Search className="mx-auto mb-3 h-8 w-8 text-[var(--gr-violet-hi)] opacity-60" />
      <p className="text-[13.5px] text-[var(--gr-text-mute)]">{label}</p>
    </div>
  );
}
