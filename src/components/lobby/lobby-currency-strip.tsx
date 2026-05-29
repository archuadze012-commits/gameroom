"use client";

import type React from "react";
import { Plus } from "lucide-react";

function NubcoinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="0.75" opacity="0.8" />
      <text
        x="8"
        y="8"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="5.5"
        fontWeight="800"
        fontFamily="sans-serif"
        fill="currentColor"
        letterSpacing="0.02"
      >
        NC
      </text>
    </svg>
  );
}
function ProCoinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* coin body */}
      <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.15" />
      {/* outer rim */}
      <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      {/* inner rim */}
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      {/* spinning 4-pointed star */}
      <g className="procoin-spin">
        <path
          d="M8 3.2 C8 3.2 8.35 6.1 8.9 7.1 C9.9 7.65 12.8 8 12.8 8 C12.8 8 9.9 8.35 8.9 8.9 C8.35 9.9 8 12.8 8 12.8 C8 12.8 7.65 9.9 7.1 8.9 C6.1 8.35 3.2 8 3.2 8 C3.2 8 6.1 7.65 7.1 7.1 C7.65 6.1 8 3.2 8 3.2 Z"
          fill="currentColor"
          opacity="0.95"
        />
      </g>
    </svg>
  );
}

import type { LobbyHudData } from "@/types/lobby";

type Currencies = { pro: number; nc: number };
type CurrencyType = keyof Currencies;

type LobbyCurrencyStripProps = {
  currencies: Currencies;
};

const currencyMeta: Array<{
  key: CurrencyType;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
  className: string;
  iconSize?: string;
  showLabel?: boolean;
}> = [
  { key: "pro", label: "Pro", icon: ProCoinIcon, className: "text-[#F5A524]", iconSize: "h-4 w-4 max-[640px]:h-3.5 max-[640px]:w-3.5", showLabel: true },
  { key: "nc", label: "Noob Coin", icon: NubcoinIcon, className: "text-[#C8D4DC]", iconSize: "h-4 w-4 max-[640px]:h-3.5 max-[640px]:w-3.5", showLabel: true },
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
      {currencyMeta.map(({ key, label, icon: Icon, className, iconSize, showLabel }) => (
        <div
          key={key}
          className="flex h-7 items-center gap-1.5 bg-[color-mix(in_srgb,var(--gr-bg-0)_72%,transparent)] px-2 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-[var(--gr-card-shadow)] ring-1 ring-[var(--gr-border)] backdrop-blur-md [clip-path:polygon(0_0,calc(100%_-_8px)_0,100%_8px,100%_100%,0_100%)] max-[640px]:h-6 max-[640px]:gap-1 max-[640px]:px-1.5 max-[640px]:text-[9px]"
          aria-label={`${label}: ${currencies[key]}`}
        >
          <Icon className={`${iconSize ?? "h-4 w-4 max-[640px]:h-3.5 max-[640px]:w-3.5"} ${className}`} />
          {showLabel && <span className={`text-[10px] font-black uppercase tracking-[0.12em] ${className}`}>{label}</span>}
          <span className="tabular-nums">{formatCompact(currencies[key])}</span>
          <button
            type="button"
            onClick={() => console.info("topup", key)}
            className="grid h-4 w-4 place-items-center rounded-full bg-[color-mix(in_srgb,var(--gr-text)_10%,transparent)] text-[var(--gr-text-mute)] transition hover:bg-[color-mix(in_srgb,var(--gr-text)_18%,transparent)] hover:text-white max-[640px]:h-3.5 max-[640px]:w-3.5"
            aria-label={`Top up ${label}`}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      ))}
    </section>
  );
}
