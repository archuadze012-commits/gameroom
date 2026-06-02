"use client";

import type React from "react";
import { Plus } from "lucide-react";

function BotcoinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.15" />
      <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <g transform="translate(0, 0.5)">
        <rect x="4.5" y="5.5" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="0.9" fill="currentColor" fillOpacity="0.1" />
        <line x1="8" y1="5.5" x2="8" y2="4" stroke="currentColor" strokeWidth="0.9" />
        <circle cx="8" cy="3.5" r="0.7" fill="currentColor" />
        <rect x="6" y="7" width="1.2" height="1.2" rx="0.3" fill="currentColor" />
        <rect x="8.8" y="7" width="1.2" height="1.2" rx="0.3" fill="currentColor" />
        <line x1="6.5" y1="9.2" x2="9.5" y2="9.2" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      </g>
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
  { key: "pro", label: "Pro", icon: ProCoinIcon, className: "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]", iconSize: "h-4 w-4", showLabel: true },
  { key: "nc", label: "Botcoin", icon: BotcoinIcon, className: "text-cyan-200 drop-shadow-[0_0_8px_rgba(165,243,252,0.5)]", iconSize: "h-4 w-4", showLabel: true },
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
    <section className="pointer-events-auto flex flex-nowrap justify-end gap-2 whitespace-nowrap">
      {currencyMeta.map(({ key, label, icon: Icon, className, iconSize, showLabel }) => (
        <div
          key={key}
          className="flex h-7 items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 text-[10px] font-black uppercase tracking-[0.06em] text-white shadow-[0_5px_15px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all hover:bg-black/60 hover:border-white/20"
          aria-label={`${label}: ${currencies[key]}`}
        >
          <Icon className={`${iconSize ?? "h-4 w-4"} ${className}`} />
          {showLabel && <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${className}`}>{label}</span>}
          <span className="font-bold tabular-nums ml-0.5">{formatCompact(currencies[key])}</span>
          <button
            type="button"
            onClick={() => console.info("topup", key)}
            className="ml-0.5 grid h-4 w-4 place-items-center rounded-full bg-white/10 text-white/70 transition-all hover:bg-white/20 hover:text-white"
            aria-label={`Top up ${label}`}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      ))}
    </section>
  );
}
