"use client";

import { Coins, Gem, Plus, WalletCards } from "lucide-react";
import type { LobbyHudData } from "@/types/lobby";

type CurrencyType = keyof LobbyHudData["currencies"];

type LobbyCurrencyStripProps = {
  currencies: LobbyHudData["currencies"];
};

const currencyMeta: Array<{
  key: CurrencyType;
  label: string;
  icon: typeof Coins;
  className: string;
}> = [
  { key: "silver", label: "Silver", icon: Coins, className: "text-[var(--gr-cyan-glow)]" },
  { key: "bp", label: "BP", icon: WalletCards, className: "text-[var(--gr-violet-hi)]" },
  { key: "uc", label: "UC", icon: Gem, className: "text-[var(--gr-amber)]" },
];

function formatCompact(value: number) {
  if (value >= 1_000_000) {
    const compact = value / 1_000_000;
    return `${compact >= 10 ? compact.toFixed(0) : compact.toFixed(1)}M`;
  }

  if (value >= 1_000) {
    const compact = value / 1_000;
    return `${compact >= 10 ? compact.toFixed(0) : compact.toFixed(1)}K`;
  }

  return `${value}`;
}

export function LobbyCurrencyStrip({ currencies }: LobbyCurrencyStripProps) {
  return (
    <section className="pointer-events-auto flex flex-wrap justify-end gap-2 max-[640px]:justify-start">
      {currencyMeta.map(({ key, label, icon: Icon, className }) => (
        <div
          key={key}
          className="flex h-10 items-center gap-2 bg-[color-mix(in_srgb,var(--gr-bg-0)_72%,transparent)] px-2.5 text-[12px] font-black uppercase tracking-[0.08em] text-white shadow-[var(--gr-card-shadow)] ring-1 ring-[var(--gr-border)] backdrop-blur-md [clip-path:polygon(0_0,calc(100%_-_10px)_0,100%_10px,100%_100%,0_100%)] max-[640px]:h-8 max-[640px]:gap-1.5 max-[640px]:px-2 max-[640px]:text-[11px]"
          aria-label={`${label}: ${currencies[key]}`}
        >
          <Icon className={`h-4 w-4 ${className} max-[640px]:h-3.5 max-[640px]:w-3.5`} />
          <span className="tabular-nums">{formatCompact(currencies[key])}</span>
          <button
            type="button"
            onClick={() => console.info("topup", key)}
            className="grid h-5 w-5 place-items-center rounded-full bg-[color-mix(in_srgb,var(--gr-text)_10%,transparent)] text-[var(--gr-text-mute)] transition hover:bg-[color-mix(in_srgb,var(--gr-text)_18%,transparent)] hover:text-white max-[640px]:h-4 max-[640px]:w-4"
            aria-label={`Top up ${label}`}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      ))}
    </section>
  );
}
