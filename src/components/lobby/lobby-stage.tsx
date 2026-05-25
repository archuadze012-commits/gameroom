"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Crosshair, DoorOpen, Gift, Swords, Target, Trophy } from "lucide-react";
import { LobbyCanvas } from "@/components/lobby/lobby-canvas";
import { LobbyFireEffect } from "@/components/lobby/lobby-fire-effect";
import { LobbyHud } from "@/components/lobby/lobby-hud";
import { LobbyInventory, type LobbyLoadout } from "@/components/lobby/lobby-inventory";
import { getLobbyLoadoutStorageKey } from "@/lib/lobby/loadout-storage";
import type { LobbyHudData } from "@/types/lobby";

type ModeKey = "classic" | "ultimate-royale" | "1v1" | "practice" | "rooms" | "giveaway" | "tournaments";

type ModeDef = {
  key: ModeKey;
  label: string;
  href: string;
  icon: typeof Crosshair;
};

const MODES: ModeDef[] = [
  { key: "classic", label: "კლასიკები", href: "/lfg?mode=classic", icon: Crosshair },
  { key: "ultimate-royale", label: "ULTIMATE ROYALE", href: "/lfg?mode=ultimate-royale", icon: Trophy },
  { key: "1v1", label: "1v1", href: "/lfg?mode=1v1", icon: Swords },
  { key: "practice", label: "პრაქტიკული თამაშები", href: "/lfg?mode=practice", icon: Target },
  { key: "rooms", label: "რუმები", href: "/rooms/new?game=pubg-mobile", icon: DoorOpen },
  { key: "giveaway", label: "გათამაშება", href: "/tamashebi", icon: Gift },
  { key: "tournaments", label: "ტურნირები", href: "/tournaments", icon: Trophy },
];

type Props = {
  gameName: string;
  gameSlug: string;
  imageUrl: string;
  hudData?: LobbyHudData | null;
  currentUserId?: string | null;
  lobbyEffect?: { effect: string; color?: string } | null;
};

const DEFAULT_LOADOUT: LobbyLoadout = {
  character: "leo",
};

const CHARACTER_URL = "/characters/gameroom-vanguard.png";

export function LobbyStage({ gameName, gameSlug, imageUrl, hudData = null, currentUserId = null, lobbyEffect = null }: Props) {
  const loadoutStorageKey = currentUserId ? getLobbyLoadoutStorageKey(gameSlug, currentUserId) : undefined;

  return (
    <div data-lobby-stage className="absolute inset-0 overflow-hidden">
      <Image
        src={imageUrl}
        alt={`${gameName} lobby`}
        fill
        priority
        quality={75}
        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 92vw, 1152px"
        className="object-cover object-center"
      />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_62%,transparent_0_28%,rgba(8,6,15,0.1)_48%,rgba(8,6,15,0.45)_100%)]" />
      <LiveHud data={hudData} />
      <StartWidget />
      <LobbyLoadoutLayer
        characterUrl={CHARACTER_URL}
        persistEnabled={Boolean(currentUserId)}
        storageKey={loadoutStorageKey}
        lobbyEffect={lobbyEffect}
      />
    </div>
  );
}

function LobbyLoadoutLayer({
  characterUrl,
  persistEnabled,
  storageKey,
  lobbyEffect,
}: {
  characterUrl: string;
  persistEnabled: boolean;
  storageKey?: string;
  lobbyEffect?: { effect: string; color?: string } | null;
}) {
  const [loadout, setLoadout] = useState<LobbyLoadout>(DEFAULT_LOADOUT);

  return (
    <>
      <LobbyCanvas />
      {/* leg contact shadow — SVG path shaped like standing legs */}
      <svg
        aria-hidden
        className="lobby-contact-shadow"
        viewBox="0 0 100 90"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="leg-shadow-blur" x="-40%" y="-20%" width="180%" height="140%">
            <feGaussianBlur stdDeviation="6.5" />
          </filter>
        </defs>
        {/* left leg */}
        <g transform="translate(0 0.9)">
          <path
            d="M 39,5 C 35,5 29,18 16,68 L 14,78 C 20,83 31,84 36,80 L 38,55 Z"
            fill="black"
            opacity="0.70"
            filter="url(#leg-shadow-blur)"
          />
        </g>
        {/* right leg (mirror) */}
        <g transform="translate(0 0.9)">
          <path
            d="M 50,5 C 54,5 61,18 74,68 L 76,78 C 70,83 59,84 54,80 L 52,55 Z"
            fill="black"
            opacity="0.70"
            filter="url(#leg-shadow-blur)"
          />
        </g>
        {/* center shadow between legs */}
        <path
          d="M 36,54 C 36,65 39,75 45,87 C 51,75 54,65 54,54 C 50,51 40,51 36,54 Z"
          fill="black"
          opacity="0.65"
          filter="url(#leg-shadow-blur)"
        />
      </svg>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={characterUrl}
        alt=""
        aria-hidden="true"
        className="lobby-character"
        draggable={false}
      />
      {lobbyEffect?.effect === "fire" && <LobbyFireEffect />}
      <LobbyInventory
        key={storageKey ?? "guest-lobby"}
        initialLoadout={loadout}
        onLoadoutChange={setLoadout}
        persistEnabled={persistEnabled}
        storageKey={storageKey}
      />
    </>
  );
}

function LiveHud({ data }: { data: LobbyHudData | null }) {
  return <LobbyHud data={data} />;
}

function StartWidget() {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState<ModeKey>("classic");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = MODES.find((m) => m.key === selectedKey) ?? MODES[0];
  const SelectedIcon = selected.icon;

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="absolute bottom-[6%] left-[3%] z-[5] w-[clamp(140px,24%,220px)] overflow-visible shadow-[0_4px_24px_rgba(0,0,0,0.7)]"
    >
      {/* Dropdown list (above the widget) */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 overflow-hidden rounded-sm border border-white/10 bg-black/85 backdrop-blur-md">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = mode.key === selectedKey;
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => {
                  setSelectedKey(mode.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors ${
                  isActive
                    ? "bg-amber-500/20 text-amber-200"
                    : "text-white/85 hover:bg-white/10"
                }`}
              >
                <Icon className={`h-3 w-3 shrink-0 ${isActive ? "text-amber-400" : "text-white/60"}`} />
                <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
                  {mode.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Header — tap to open list */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between bg-black/70 px-2 py-1.5 backdrop-blur-sm transition-colors hover:bg-black/85"
      >
        <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/80">
          აირჩიე რეჟიმი
        </span>
        <ChevronDown
          className={`h-2.5 w-2.5 text-white/60 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Selected mode display */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 bg-black/55 px-2 py-1.5 backdrop-blur-sm transition-colors hover:bg-black/70"
      >
        <SelectedIcon className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1 text-left">
          <div className="truncate text-[10px] font-bold leading-none text-white">
            {selected.label}
          </div>
          <div className="mt-0.5 text-[7px] leading-none text-white/45">
            არჩეული რეჟიმი
          </div>
        </div>
      </button>

      {/* START button — navigates to selected mode's page */}
      <button
        type="button"
        onClick={() => router.push(selected.href)}
        className="block w-full py-2.5 text-center font-display text-[clamp(14px,2.2vw,20px)] font-black uppercase tracking-widest text-black transition-[filter,transform] hover:brightness-110 active:scale-[0.97]"
        style={{
          background: "linear-gradient(180deg, #f5c842 0%, #e6a800 55%, #c87f00 100%)",
          textShadow: "0 1px 0 rgba(255,255,255,0.25)",
        }}
      >
        START
      </button>
    </div>
  );
}
