"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type LobbyModeKey =
  | "classic"
  | "arcade"
  | "tdm"
  | "1v1"
  | "rooms"
  | "giveaway"
  | "tournaments";

export type LobbyMap = "Erangel" | "Miramar" | "Sanhok" | "Vikendi";
export type LobbyPerspective = "TPP" | "FPP";
export type LobbySquadSize = "Solo" | "Duo" | "Squad";

export type LobbyModeDef = {
  key: LobbyModeKey;
  label: string;
  sublabel: string;
  description: string;
  icon: LucideIcon;
  href: string;
};

type LobbyModeCardProps = {
  mode: LobbyModeDef;
  map: LobbyMap;
  perspective: LobbyPerspective;
  squadSize: LobbySquadSize;
  onMapChange: (map: LobbyMap) => void;
  onPerspectiveChange: (perspective: LobbyPerspective) => void;
  onSquadSizeChange: (size: LobbySquadSize) => void;
};

const maps: LobbyMap[] = ["Erangel", "Miramar", "Sanhok", "Vikendi"];
const perspectives: LobbyPerspective[] = ["TPP", "FPP"];
const squadSizes: LobbySquadSize[] = ["Solo", "Duo", "Squad"];

function mapPath(map: LobbyMap) {
  return `/lobbies/maps/${map.toLowerCase()}.jpg`;
}

export function LobbyModeCard({
  mode,
  map,
  perspective,
  squadSize,
  onMapChange,
  onPerspectiveChange,
  onSquadSizeChange,
}: LobbyModeCardProps) {
  const Icon = mode.icon;
  const supportsClassicOptions = mode.key === "classic";

  return (
    <section className="lobby-mode-card motion-safe:lobby-mode-card-in pointer-events-auto w-[min(360px,48vw)] bg-[color-mix(in_srgb,var(--gr-bg-0)_76%,transparent)] p-3 text-white shadow-[var(--gr-card-shadow)] ring-1 ring-[var(--gr-border-hi)] backdrop-blur-md [clip-path:polygon(0_0,calc(100%_-_18px)_0,100%_18px,100%_100%,0_100%)] max-[760px]:w-[min(340px,54vw)] max-[760px]:p-2.5">
      <div className="flex gap-3">
        <div
          className="relative h-24 w-32 shrink-0 overflow-hidden bg-[var(--gr-bg-2)] bg-cover bg-center ring-1 ring-[color-mix(in_srgb,var(--gr-amber)_44%,transparent)] [clip-path:polygon(0_0,100%_0,100%_calc(100%_-_12px),calc(100%_-_12px)_100%,0_100%)] max-[760px]:h-20 max-[760px]:w-24"
          style={{ backgroundImage: `linear-gradient(180deg, transparent, color-mix(in srgb, var(--gr-bg-0) 54%, transparent)), url(${mapPath(map)})` }}
          aria-label={`${map} map preview`}
        >
          <div className="absolute bottom-1.5 left-1.5 bg-[color-mix(in_srgb,var(--gr-bg-0)_78%,transparent)] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[var(--gr-amber)]">
            {supportsClassicOptions ? map : mode.key}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center bg-[color-mix(in_srgb,var(--gr-amber)_18%,transparent)] text-[var(--gr-amber)] ring-1 ring-[color-mix(in_srgb,var(--gr-amber)_40%,transparent)] [clip-path:polygon(0_0,100%_0,100%_100%,7px_100%,0_calc(100%_-_7px))]">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-display text-[28px] font-black uppercase leading-none tracking-normal text-white max-[760px]:text-[21px]">
                {mode.label}
              </h2>
              <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--gr-amber)] max-[760px]:text-[9px]">
                {mode.sublabel}
              </p>
            </div>
          </div>
          <p className="mt-3 line-clamp-2 text-[12px] font-semibold leading-snug text-[var(--gr-text-mute)] max-[760px]:mt-2 max-[760px]:text-[10px]">
            {mode.description}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 max-[760px]:mt-2 max-[760px]:gap-1.5">
        <ChipGroup label="Map" disabled={!supportsClassicOptions}>
          {maps.map((option) => (
            <ChipButton
              key={option}
              active={map === option}
              disabled={!supportsClassicOptions}
              onClick={() => onMapChange(option)}
            >
              {option}
            </ChipButton>
          ))}
        </ChipGroup>

        <ChipGroup label="Perspective" disabled={!supportsClassicOptions}>
          {perspectives.map((option) => (
            <ChipButton
              key={option}
              active={perspective === option}
              disabled={!supportsClassicOptions}
              onClick={() => onPerspectiveChange(option)}
            >
              {option}
            </ChipButton>
          ))}
        </ChipGroup>

        <ChipGroup label="Squad" disabled={!supportsClassicOptions}>
          {squadSizes.map((option) => (
            <ChipButton
              key={option}
              active={squadSize === option}
              disabled={!supportsClassicOptions}
              onClick={() => onSquadSizeChange(option)}
            >
              {option}
            </ChipButton>
          ))}
        </ChipGroup>
      </div>
    </section>
  );
}

function ChipGroup({
  label,
  disabled,
  children,
}: {
  label: string;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <div className={disabled ? "opacity-45" : ""}>
      <div className="mb-1 text-[8px] font-black uppercase tracking-[0.18em] text-[var(--gr-text-dim)]">
        {label}
      </div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function ChipButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "h-6 px-2 text-[9px] font-black uppercase tracking-[0.08em] transition [clip-path:polygon(0_0,calc(100%_-_6px)_0,100%_6px,100%_100%,0_100%)] max-[760px]:h-5 max-[760px]:px-1.5 max-[760px]:text-[8px]",
        active
          ? "bg-[var(--gr-amber)] text-[var(--gr-bg-0)]"
          : "bg-[color-mix(in_srgb,var(--gr-text)_9%,transparent)] text-[var(--gr-text-mute)] hover:bg-[color-mix(in_srgb,var(--gr-text)_16%,transparent)] hover:text-white",
        disabled ? "cursor-not-allowed hover:bg-[color-mix(in_srgb,var(--gr-text)_9%,transparent)] hover:text-[var(--gr-text-mute)]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
