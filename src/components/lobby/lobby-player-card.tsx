"use client";

import type { LobbyHudData } from "@/types/lobby";

type LobbyPlayerCardProps = {
  player: LobbyHudData["player"];
};

export function LobbyPlayerCard({ player }: LobbyPlayerCardProps) {
  const initial = player.displayName.trim().slice(0, 1).toUpperCase() || "G";

  return (
    <section
      className="pointer-events-auto flex w-full items-center gap-3 text-white transition-all"
      aria-label={`${player.displayName} lobby profile`}
    >
      <div className="relative shrink-0">
        <div className="h-10 w-10 overflow-hidden">
          {player.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.avatarUrl} alt={player.displayName} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#6366f1,#ec4899)] font-display text-lg font-black text-white">
              {initial}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 right-0 p-0.5 text-[9px] font-black text-white drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)] leading-none">
          {player.level}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[10px] font-black uppercase tracking-wider leading-tight text-white drop-shadow-sm">
          {player.displayName}
        </div>
      </div>
    </section>
  );
}
