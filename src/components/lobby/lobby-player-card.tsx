"use client";

import { type CSSProperties, useId } from "react";
import type { LobbyHudData, Tier } from "@/types/lobby";

type LobbyPlayerCardProps = {
  player: LobbyHudData["player"];
};

const tierLabel: Record<Tier, string> = {
  bronze: "BRZ",
  silver: "SLV",
  gold: "GLD",
  platinum: "PLT",
  diamond: "DIA",
  crown: "CRW",
  ace: "ACE",
  conqueror: "CON",
};

const tierToken: Record<Tier, string> = {
  bronze: "var(--tier-bronze)",
  silver: "var(--tier-silver)",
  gold: "var(--tier-gold)",
  platinum: "var(--tier-plat)",
  diamond: "var(--tier-diamond)",
  crown: "var(--tier-crown)",
  ace: "var(--tier-ace)",
  conqueror: "var(--tier-ace)",
};

export function LobbyPlayerCard({ player }: LobbyPlayerCardProps) {
  const gradientId = `tier-${useId().replaceAll(":", "")}`;
  const initial = player.displayName.trim().slice(0, 1).toUpperCase() || "G";
  const progress = `${Math.max(0, Math.min(1, player.levelProgress)) * 100}%`;
  const tierStyle = { "--tier-accent": tierToken[player.tier] } as CSSProperties;

  return (
    <section
      className="pointer-events-auto flex min-w-[230px] max-w-[330px] items-center gap-3 bg-[color-mix(in_srgb,var(--gr-bg-0)_78%,transparent)] px-3 py-2 text-[var(--gr-text)] shadow-[var(--gr-card-shadow)] ring-1 ring-[var(--gr-border-hi)] backdrop-blur-md [clip-path:polygon(0_0,calc(100%_-_16px)_0,100%_16px,100%_100%,0_100%)] max-[640px]:min-w-0 max-[640px]:max-w-full max-[640px]:px-2.5 max-[640px]:py-2"
      style={tierStyle}
      aria-label={`${player.displayName} lobby profile`}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-[var(--gr-bg-2)] ring-2 ring-[var(--tier-accent)] [clip-path:polygon(0_0,100%_0,100%_100%,8px_100%,0_calc(100%_-_8px))] max-[640px]:h-12 max-[640px]:w-12">
        {player.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.avatarUrl} alt={player.displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[var(--gr-grad-violet)] font-display text-lg font-extrabold text-white">
            {initial}
          </div>
        )}

        <svg
          aria-label={`${player.tier} ${player.tierSub}`}
          viewBox="0 0 32 32"
          className="absolute -bottom-1 -right-1 h-7 w-7 drop-shadow-[0_0_10px_var(--tier-accent)]"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--tier-ace)" />
              <stop offset="55%" stopColor="var(--tier-gold)" />
              <stop offset="100%" stopColor="var(--tier-crown)" />
            </linearGradient>
          </defs>
          <path
            d="M16 2 29 9v14l-13 7-13-7V9z"
            fill={player.tier === "conqueror" ? `url(#${gradientId})` : "var(--tier-accent)"}
          />
          <path d="M16 7 24 12v8l-8 5-8-5v-8z" fill="var(--gr-bg-0)" opacity="0.72" />
          <text
            x="16"
            y="18.5"
            textAnchor="middle"
            className="fill-white text-[7px] font-black uppercase tracking-normal"
          >
            {tierLabel[player.tier]}
          </text>
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[15px] font-extrabold leading-tight text-white max-[640px]:text-[13px]">
          {player.displayName}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--gr-text-mute)] max-[640px]:text-[10px]">
          <span>Lv. {player.level}</span>
          <span className="h-1 w-1 rounded-full bg-[var(--tier-accent)]" />
          <span>
            {player.tier} {player.tierSub}
          </span>
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
