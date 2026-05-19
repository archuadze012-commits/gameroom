"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { GameIcon } from "@/components/game-icon";
import { mockGames } from "@/lib/mock-data";
import { RoleBadge } from "@/components/role-badge";
import type { UserRole } from "@/lib/types";

type CardUser = {
  username: string;
  displayName: string | null;
  region?: string | null;
  voiceChat?: boolean;
  role?: UserRole;
  games?: { slug: string; rank: string }[];
};

type Props = { user: CardUser };

export function PlayerCard({ user }: Props) {
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);

  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem("gameroom_avatars");
        if (!raw) return;
        const map = JSON.parse(raw) as Record<string, string>;
        if (map[user.username]) setAvatarSrc(map[user.username]);
      } catch {}
    }
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, [user.username]);

  const games = (user.games ?? [])
    .slice(0, 3)
    .map((g) => mockGames.find((mg) => mg.slug === g.slug))
    .filter(Boolean) as typeof mockGames;

  return (
    <Link href={`/profile/${user.username}`} className="group">
      <Card className="relative h-52 overflow-hidden border-border/60 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
        <img
          src={avatarSrc ?? "/default-avatar.svg"}
          alt={user.displayName ?? user.username}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-3">
          <div>
            <RoleBadge username={user.username} defaultRole={user.role} />
            <p className="font-bold text-white leading-tight">
              {user.displayName ?? user.username}
            </p>
            <p className="text-xs text-white/60">
              {user.region ?? ""}
              {user.voiceChat ? " · 🎙" : ""}
            </p>
          </div>
          {games.length > 0 && (
            <div className="flex items-center gap-1">
              {games.map((g) => (
                <div
                  key={g.slug}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/50 backdrop-blur-sm"
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
