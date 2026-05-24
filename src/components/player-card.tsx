"use client";

import Link from "next/link";
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

const cutSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.55))";

// Deterministic gradient per username — consistent backdrop for cards without banners.
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
      {/* outer 1px magenta/violet gradient border */}
      <div
        className="relative isolate"
        style={{ background: cardBorder, padding: 1, clipPath: cutSm }}
      >
        <div
          className="relative h-52 overflow-hidden bg-[var(--gr-bg-1)] gr-sweep"
          style={{ clipPath: cutSm }}
        >
          {/* Banner backdrop */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={bannerStyle}
          />
          {/* Dark gradient overlay for legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--gr-bg-0)]/30 via-[var(--gr-bg-0)]/45 to-[var(--gr-bg-0)]/90" />

          {/* top gradient hairline */}
          <span aria-hidden className="absolute left-0 top-0 z-10 h-[2px] w-full bg-[var(--gr-grad-violet)]" />

          {/* Online dot */}
          <div
            className="absolute left-3 top-3 z-10 h-3 w-3 rounded-full ring-2 ring-[var(--gr-bg-0)]/80 shadow-md"
            style={{ backgroundColor: user.isOnline ? "var(--gr-lime)" : "var(--gr-amber)" }}
          />

          {/* Centered avatar */}
          <div className="absolute left-1/2 top-9 -translate-x-1/2">
            <div className="relative">
              <div className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-[var(--gr-violet-hi)]/40 shadow-xl">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={displayName}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--gr-violet)]/20 text-2xl font-bold text-[var(--gr-violet-hi)]">
                    {initial}
                  </div>
                )}
              </div>
              {user.isVerified && (
                <span className="absolute -bottom-1 -right-1 rounded-full bg-[var(--gr-bg-1)] p-0.5 shadow ring-1 ring-[var(--gr-border-hi)]">
                  <VerifiedBadge className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 z-10 flex items-end justify-between gap-2 p-3">
            <div className="min-w-0 flex-1">
              {user.role && user.role !== "user" && (
                <RoleBadge username={user.username} defaultRole={user.role} />
              )}
              <p className="mt-0.5 truncate text-sm font-bold text-[var(--gr-text)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
                {displayName}
              </p>
              <p className="flex items-center gap-1 text-[10px] text-[var(--gr-text)]/70">
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
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--gr-bg-0)]/70 backdrop-blur-sm ring-1 ring-white/10"
                  >
                    <GameIcon game={g} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
