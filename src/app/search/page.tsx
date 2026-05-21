"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Users, Gamepad2, Download, Star, ShieldCheck, Shield, Trophy, MonitorPlay, Loader2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { mockGames, crackedGames } from "@/lib/mock-data";
import { PlayerCard } from "@/components/player-card";
import { GameIcon } from "@/components/game-icon";
import type { PublicProfile, UserRole } from "@/lib/types";

type Tab = "players" | "games" | "cracked";
type RoleFilter = "all" | Exclude<UserRole, "user">;

const ROLE_FILTERS: { role: RoleFilter; label: string; icon: React.ReactNode; className: string }[] = [
  { role: "all",       label: "ყველა",           icon: <Users className="h-3.5 w-3.5" />,        className: "border-border text-foreground" },
  { role: "admin",     label: "ადმინი",           icon: <ShieldCheck className="h-3.5 w-3.5" />,  className: "border-rose-500/40 text-rose-400" },
  { role: "moderator", label: "მოდერატორი",       icon: <Shield className="h-3.5 w-3.5" />,       className: "border-amber-500/40 text-amber-400" },
  { role: "organizer", label: "ორგანიზატორი",     icon: <Trophy className="h-3.5 w-3.5" />,       className: "border-yellow-500/40 text-yellow-400" },
  { role: "streamer",  label: "სტრიმერი",         icon: <MonitorPlay className="h-3.5 w-3.5" />,  className: "border-violet-500/40 text-violet-400" },
  { role: "esports",   label: "კიბერსპორტსმენი", icon: <Gamepad2 className="h-3.5 w-3.5" />,     className: "border-cyan-500/40 text-cyan-400" },
];

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
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ძებნა</h1>
        <p className="mt-2 text-muted-foreground">იპოვე მოთამაშეები, თამაშები ან PC თამაშები უფასოდ</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          placeholder="username, თამაში, ჟანრი, პლატფორმა..."
          className="pl-10 h-12 text-base"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-secondary/20 p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {t.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Players */}
      {tab === "players" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span>ონლაინი — {onlineCount}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {ROLE_FILTERS.map((f) => {
              const isActive = roleFilter === f.role;
              const count = roleCounts[f.role] ?? 0;
              return (
                <button
                  key={f.role}
                  onClick={() => setRoleFilter(f.role)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? `${f.className} bg-secondary/60`
                      : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {f.icon}
                  {f.label}
                  <span className={`rounded-full px-1.5 text-[10px] ${isActive ? "bg-white/10" : "bg-secondary text-muted-foreground"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> იტვირთება...
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {q
                  ? `${playerResults.length} შედეგი "${query}"-სთვის`
                  : roleFilter === "all"
                  ? `სულ ${playerResults.length} მოთამაშე`
                  : `${playerResults.length} მოთამაშე`}
              </p>
              {playerResults.length === 0 ? (
                <EmptyState label="მოთამაშე ვერ მოიძებნა" />
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
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            {q ? `${gameResults.length} შედეგი "${query}"-სთვის` : `სულ ${gameResults.length} თამაში`}
          </p>
          {gameResults.length === 0 ? (
            <EmptyState label="თამაში ვერ მოიძებნა" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {gameResults.map((g) => (
                <Link key={g.slug} href={`/games/${g.slug}`} className="group">
                  <Card className="relative h-40 overflow-hidden border-border/60 transition-all hover:border-primary/40">
                    {g.coverUrl ? (
                      <img
                        src={g.coverUrl}
                        alt={g.nameKa}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br ${g.accent}`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
                      <div className="flex items-center gap-2">
                        <GameIcon game={g} size="sm" />
                        <div>
                          <p className="font-semibold text-white leading-tight group-hover:text-primary transition-colors">
                            {g.nameKa}
                          </p>
                          <p className="text-[11px] text-white/60">{g.players.toLocaleString("en-US")} მოთამაშე</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/40 shrink-0">
                        🟢 {g.online}
                      </Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cracked Games */}
      {tab === "cracked" && (
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            {q ? `${crackedResults.length} შედეგი "${query}"-სთვის` : `სულ ${crackedResults.length} cracked game`}
          </p>
          {crackedResults.length === 0 ? (
            <EmptyState label="Cracked game ვერ მოიძებნა" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {crackedResults.map((g) => (
                <Link key={g.id} href={`/tamashebi/${g.id}`}>
                  <Card className="relative overflow-hidden border-border/60 transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 h-full">
                    <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${g.accent} opacity-50`} />
                    <CardContent className="p-4 flex flex-col gap-3 h-full">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-3xl">{g.emoji}</span>
                        <div className="flex items-center gap-1 text-amber-400 shrink-0">
                          <Star className="h-3.5 w-3.5 fill-amber-400" />
                          <span className="text-sm font-bold">{g.rating}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold leading-tight">{g.title}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">{g.releaseYear}</p>
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {g.description}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {g.genre.map((genre) => (
                          <Badge key={genre} variant="secondary" className="text-xs">{genre}</Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {g.platform.map((p) => (
                          <Badge key={p} variant="outline" className="text-xs border-border/60">{p}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-border/60 py-16 text-center text-muted-foreground">
      <Search className="mx-auto mb-3 h-8 w-8 opacity-40" />
      <p>{label}</p>
    </div>
  );
}
