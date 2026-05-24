"use client";

import { Crosshair, DoorOpen, Gift, Swords, Trophy, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  LobbyModeCard,
  type LobbyMap,
  type LobbyModeDef,
  type LobbyModeKey,
  type LobbyPerspective,
  type LobbySquadSize,
} from "@/components/lobby/lobby-mode-card";
import { LobbyStartButton } from "@/components/lobby/lobby-start-button";

const STORAGE_KEY = "lobby:lastMode";

const MODES: LobbyModeDef[] = [
  {
    key: "classic",
    label: "Classic",
    sublabel: "Erangel · TPP · Squad",
    icon: Crosshair,
    href: "/lfg?mode=classic",
    description: "The full battleground run: pick a map, squad up, and find a Georgian team fast.",
  },
  {
    key: "arcade",
    label: "Arcade",
    sublabel: "Quick · Random",
    icon: Zap,
    href: "/lfg?mode=arcade",
    description: "Short, loud, and immediate. Jump into quick fights without committing to a long session.",
  },
  {
    key: "tdm",
    label: "TDM",
    sublabel: "4v4 Warehouse",
    icon: Swords,
    href: "/lfg?mode=tdm",
    description: "Warehouse pressure with tight rotations, fast respawns, and no downtime.",
  },
  {
    key: "1v1",
    label: "1v1",
    sublabel: "Dueling Arena",
    icon: Swords,
    href: "/lfg?mode=1v1",
    description: "Settle it directly. Find an opponent, choose the rules, and keep it clean.",
  },
  {
    key: "rooms",
    label: "Rooms",
    sublabel: "Custom lobby",
    icon: DoorOpen,
    href: "/rooms/new?game=pubg-mobile",
    description: "Create a custom lobby for friends, followers, or a private scrim.",
  },
  {
    key: "giveaway",
    label: "Giveaway",
    sublabel: "Prizes",
    icon: Gift,
    href: "/tamashebi",
    description: "Check active prize drops and community rewards before the next match starts.",
  },
  {
    key: "tournaments",
    label: "Tournaments",
    sublabel: "Compete",
    icon: Trophy,
    href: "/tournaments",
    description: "Move from casual queue to bracket play when the squad is ready.",
  },
];

const modeKeys = new Set<LobbyModeKey>(MODES.map((mode) => mode.key));

export function StartWidget() {
  return <LobbyModeBar />;
}

export function LobbyModeBar() {
  const [modeKey, setModeKey] = useState<LobbyModeKey>("classic");
  const [map, setMap] = useState<LobbyMap>("Erangel");
  const [perspective, setPerspective] = useState<LobbyPerspective>("TPP");
  const [squadSize, setSquadSize] = useState<LobbySquadSize>("Squad");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && modeKeys.has(saved as LobbyModeKey)) {
      setModeKey(saved as LobbyModeKey);
    }
  }, []);

  const selected = useMemo(() => MODES.find((mode) => mode.key === modeKey) ?? MODES[0], [modeKey]);

  const selectMode = (nextMode: LobbyModeKey) => {
    setModeKey(nextMode);
    window.localStorage.setItem(STORAGE_KEY, nextMode);
  };

  return (
    <div className="absolute bottom-[4%] inset-x-[6%] z-30 flex items-end justify-between gap-4 max-[760px]:inset-x-[4%] max-[760px]:bottom-[3%]">
      <div className="min-w-0">
        <div className="scrollbar-hide mb-2 flex max-w-[520px] gap-2 overflow-x-auto pb-1">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = mode.key === modeKey;

            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => selectMode(mode.key)}
                className={[
                  "group flex h-12 min-w-[118px] items-center gap-2 bg-[color-mix(in_srgb,var(--gr-bg-0)_68%,transparent)] px-2.5 text-left ring-1 backdrop-blur-md transition [clip-path:polygon(0_0,calc(100%_-_10px)_0,100%_10px,100%_100%,0_100%)] max-[760px]:h-10 max-[760px]:min-w-[98px]",
                  isActive
                    ? "ring-[var(--gr-amber)]"
                    : "ring-[var(--gr-border)] hover:ring-[color-mix(in_srgb,var(--gr-amber)_56%,transparent)]",
                ].join(" ")}
              >
                <Icon
                  className={[
                    "h-4 w-4 shrink-0 transition max-[760px]:h-3.5 max-[760px]:w-3.5",
                    isActive ? "text-[var(--gr-amber)]" : "text-[var(--gr-text-mute)] group-hover:text-white",
                  ].join(" ")}
                />
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-white max-[760px]:text-[9px]">
                    {mode.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--gr-text-dim)]">
                    {mode.sublabel}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <LobbyModeCard
          key={selected.key}
          mode={selected}
          map={map}
          perspective={perspective}
          squadSize={squadSize}
          onMapChange={setMap}
          onPerspectiveChange={setPerspective}
          onSquadSizeChange={setSquadSize}
        />
      </div>

      <LobbyStartButton href={selected.href} />
    </div>
  );
}
