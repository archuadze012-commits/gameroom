"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { GameIcon } from "@/components/game-icon";
import { mockGames } from "@/lib/mock-data";
import { RoleBadge } from "@/components/role-badge";
import { VerifiedBadge } from "@/components/verified-badge";
import { Mic } from "lucide-react";
import type { UserRole } from "@/lib/types";

type CardUser = {
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  isVerified?: boolean;
  region?: string | null;
  voiceChat?: boolean;
  role?: UserRole;
  games?: { slug: string; rank: string }[];
  isOnline?: boolean;
};

type Props = { user: CardUser };

// Build a deterministic gradient from username for users without banners,
// so each card has its own consistent backdrop color.
function gradientForUser(username: string): string {
  let h = 0;
  for (let i = 0; i < username.length; i++) {
    h = (h * 31 + username.charCodeAt(i)) >>> 0;
  }
  const hue1 = h % 360;
  const hue2 = (hue1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue1} 60% 25%) 0%, hsl(${hue2} 55% 18%) 100%)`;
}

export function PlayerCard({ user }: Props) {
  const games = (user.games ?? [])
    .slice(0, 3)
    .map((g) => mockGames.find((mg) => mg.slug === g.slug))
    .filter(Boolean) as typeof mockGames;

  const displayName = user.displayName ?? user.username;
  const initial = displayName.slice(0, 1).toUpperCase();
  const bannerStyle = user.bannerUrl
    ? { backgroundImage: `url(${user.bannerUrl})` }
    : { backgroundImage: gradientForUser(user.username) };

  return (
    <Link href={`/profile/${user.username}`} className="group block">
      <Card className="relative h-52 overflow-hidden border-border/60 p-0 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
        {/* Banner backdrop (full-bleed) */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
          style={bannerStyle}
        />
        {/* Dark gradient overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/85" />

        {/* Online dot */}
        <div
          className="absolute left-3 top-3 h-3.5 w-3.5 rounded-full border-2 border-background/80 shadow-md"
          style={{ backgroundColor: user.isOnline ? "#10b981" : "#f59e0b" }}
        />

        {/* Centered avatar */}
        <div className="absolute left-1/2 top-9 -translate-x-1/2">
          <div className="relative">
            <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-background/80 shadow-xl ring-2 ring-primary/20">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary/15 text-2xl font-bold text-primary">
                  {initial}
                </div>
              )}
            </div>
            {user.isVerified && (
              <span className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5 shadow">
                <VerifiedBadge className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 p-3">
          <div className="min-w-0 flex-1">
            {user.role && user.role !== "user" && (
              <RoleBadge username={user.username} defaultRole={user.role} />
            )}
            <p className="mt-0.5 flex items-center gap-1 truncate text-sm font-bold text-white">
              {displayName}
            </p>
            <p className="flex items-center gap-1 text-[10px] text-white/60">
              {user.region && <span>{user.region}</span>}
              {user.voiceChat && (
                <>
                  {user.region && <span>·</span>}
                  <Mic className="h-2.5 w-2.5" />
                </>
              )}
            </p>
          </div>
          {games.length > 0 && (
            <div className="flex shrink-0 items-center gap-1">
              {games.map((g) => (
                <div
                  key={g.slug}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-black/60 backdrop-blur-sm"
                >
                  <GameIcon game={g} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
