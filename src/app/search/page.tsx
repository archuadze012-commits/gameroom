"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Users, Gamepad2, Download, Star, ShieldCheck, Shield, Trophy, MonitorPlay, Loader2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { mockGames, crackedGames } from "@/lib/mock-data";
import { PlayerCard } from "@/components/player-card";
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
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {playerResults.map((user) => (
                    <PlayerCard key={user.username} user={user} />
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {gameResults.map((g) => (
                <Link key={g.slug} href={`/games/${g.slug}`} className="group block">
                  <div
                    className="relative isolate"
                    style={{ background: cardBorder, padding: 1, clipPath: cutSm }}
                  >
                    <div
                      className="relative h-40 overflow-hidden bg-[var(--gr-bg-1)] gr-sweep"
                      style={{ clipPath: cutSm }}
                    >
                      <span aria-hidden className="absolute left-0 top-0 z-10 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
                      {g.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={g.coverUrl}
                          alt={g.nameKa}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${g.accent}`} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)] via-[var(--gr-bg-0)]/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 p-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <GameIcon game={g} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold leading-tight text-[var(--gr-text)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
                              {g.nameKa}
                            </p>
                            <p className="text-[11px] text-[var(--gr-text)]/65">{g.players.toLocaleString("en-US")} მოთამაშე</p>
                          </div>
                        </div>
                        <Pill tone="online" pulse>{g.online}</Pill>
                      </div>
                    </div>
                  </div>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {crackedResults.map((g) => (
                <Link key={g.id} href={`/tamashebi/${g.id}`} className="group block">
                  <div
                    className="relative isolate"
                    style={{ background: cardBorder, padding: 1, clipPath: cutSm }}
                  >
                    <div
                      className="relative h-full bg-[var(--gr-bg-1)] p-4 gr-sweep"
                      style={{ clipPath: cutSm }}
                    >
                      <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
                      <div className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br ${g.accent} opacity-25`} />
                      <div className="flex h-full flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">{g.emoji}</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gr-amber)]/15 px-2 py-0.5 text-[12px] font-bold text-[var(--gr-amber)] ring-1 ring-[var(--gr-amber)]/40">
                            <Star className="h-3 w-3 fill-[var(--gr-amber)]" />
                            {g.rating}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-display text-[15px] font-bold uppercase tracking-tight text-[var(--gr-text)] leading-tight">{g.title}</h3>
                          <p className="mt-0.5 text-[11px] text-[var(--gr-text-dim)]">{g.releaseYear}</p>
                          <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-[var(--gr-text-mute)]">
                            {g.description}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {g.genre.map((genre) => (
                            <Pill key={genre} tone="violet">{genre}</Pill>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {g.platform.map((p) => (
                            <Pill key={p} tone="neutral">{p}</Pill>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
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
