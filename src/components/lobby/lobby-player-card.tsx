"use client";

import type { LobbyHudData } from "@/types/lobby";

type LobbyPlayerCardProps = {
  player: LobbyHudData["player"];
};

export function LobbyPlayerCard({ player }: LobbyPlayerCardProps) {
  const initial = player.displayName.trim().slice(0, 1).toUpperCase() || "G";
  const progress = `${Math.max(0, Math.min(1, player.levelProgress)) * 100}%`;

  return (
    <section
      className="pointer-events-auto flex min-w-[230px] max-w-[330px] items-center gap-3 bg-[color-mix(in_srgb,var(--gr-bg-0)_78%,transparent)] px-3 py-2 text-[var(--gr-text)] shadow-[var(--gr-card-shadow)] ring-1 ring-[var(--gr-border-hi)] backdrop-blur-md [clip-path:polygon(0_0,calc(100%_-_16px)_0,100%_16px,100%_100%,0_100%)] max-[640px]:min-w-0 max-[640px]:max-w-full max-[640px]:px-2.5 max-[640px]:py-2"
      aria-label={`${player.displayName} lobby profile`}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-[var(--gr-bg-2)] ring-2 ring-[var(--gr-violet-hi)] [clip-path:polygon(0_0,100%_0,100%_100%,8px_100%,0_calc(100%_-_8px))] max-[640px]:h-12 max-[640px]:w-12">
        {player.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.avatarUrl} alt={player.displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[var(--gr-grad-violet)] font-display text-lg font-extrabold text-white">
            {initial}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[15px] font-extrabold leading-tight text-white max-[640px]:text-[13px]">
          {player.displayName}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--gr-text-mute)] max-[640px]:text-[10px]">
          <span>Lv. {player.level}</span>
        </div>
        <div className="mt-2 h-0.5 overflow-hidden bg-[color-mix(in_srgb,var(--gr-violet)_18%,transparent)]">
          <div
            className="h-full bg-[linear-gradient(90deg,var(--gr-violet),var(--gr-amber))]"
            style={{ width: progress }}
          />
        </div>
      </div>
    </section>
  );
}
