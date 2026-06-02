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
    <Link href={`/profile/${user.username}`} className="group block h-full">
      <div className="relative isolate h-full rounded-[20px] p-[1.5px] bg-gradient-to-br from-[#00d0ff] via-[#6366f1] to-[#f43f5e] transition-all duration-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:-translate-y-1">
        <div className="relative h-full overflow-hidden rounded-[18.5px] bg-[#0a0714] flex flex-col">
          <div className="relative h-40 overflow-hidden shrink-0">
            {/* Banner backdrop */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={bannerStyle}
            />
            {/* Dark gradient overlay for legibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(10,7,20,0.4)] to-[#0a0714]" />
            
            {/* pink overlay on hover */}
            <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] bg-pink-500/0 duration-500 group-hover:bg-pink-500/10 mix-blend-overlay" />

          {/* Online dot */}
          <div
            className="absolute left-3 top-3 z-10 h-3 w-3 rounded-full ring-2 ring-black/50 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
            style={{ 
              backgroundColor: user.isOnline ? "#10b981" : "#f59e0b",
              boxShadow: user.isOnline ? "0 0 10px #10b981" : "0 0 10px #f59e0b" 
            }}
          />

          {/* Centered avatar */}
          <div className="absolute left-1/2 top-10 -translate-x-1/2 transition-transform duration-500 group-hover:scale-105">
            <div className="relative">
              <div className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-white/10 shadow-[0_0_20px_rgba(0,0,0,0.8)] group-hover:ring-pink-500/50 group-hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] transition-all">
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
                  <div className="flex h-full w-full items-center justify-center bg-violet-500/20 text-2xl font-bold text-violet-400">
                    {initial}
                  </div>
                )}
              </div>
              {user.isVerified && (
                <span className="absolute -bottom-1 -right-1 rounded-full bg-black p-0.5 shadow-md ring-1 ring-white/20">
                  <VerifiedBadge className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
          </div>
        </div>
        {/* Bottom info */}
        <div className="relative z-10 flex flex-col p-4 bg-[rgba(15,12,30,0.95)]">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                {user.role && user.role !== "user" && (
                  <RoleBadge username={user.username} defaultRole={user.role} />
                )}
                <p className="truncate text-[15px] font-black text-white drop-shadow-md group-hover:text-pink-400 transition-colors">
                  {displayName}
                </p>
              </div>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40">
                {user.region && <span>{user.region}</span>}
                {user.voiceChat && (
                  <>
                    {user.region && <span>·</span>}
                    <Mic className="h-3 w-3 text-pink-400" />
                  </>
                )}
              </p>
            </div>
          </div>

          {games.length > 0 && (
            <div className="flex shrink-0 items-center gap-1.5 mt-1">
              {games.map((g) => (
                <div
                  key={g.slug}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 backdrop-blur-md transition-colors group-hover:border-pink-500/20 group-hover:bg-pink-500/10"
                >
                  <GameIcon game={g} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
