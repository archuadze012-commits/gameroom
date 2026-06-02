"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, Crosshair, DoorOpen, Gift, Swords, Target, Trophy } from "lucide-react";
import dynamic from "next/dynamic";

const LobbyCanvas = dynamic(
  () => import("@/components/lobby/lobby-canvas").then((m) => ({ default: m.LobbyCanvas })),
  { ssr: false },
);
import { LobbyFireEffect } from "@/components/lobby/lobby-fire-effect";
import { LobbyHud } from "@/components/lobby/lobby-hud";
import { LobbyInventory, type LobbyLoadout } from "@/components/lobby/lobby-inventory";
import { LobbyWeaponStand } from "@/components/lobby/lobby-weapon-stand";
import { LOBBY_SCENE_HEIGHT, LOBBY_SCENE_WIDTH, LOBBY_UI_SCALE, lobbyX, lobbyY } from "@/components/lobby/lobby-coordinate-system";
import { getLobbyLoadoutStorageKey } from "@/lib/lobby/loadout-storage";
import { saveLobbyLoadout } from "@/lib/lobby/loadout-actions";
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
  { key: "giveaway", label: "გათამაშება", href: "/free-pc-games", icon: Gift },
  { key: "tournaments", label: "ტურნირები", href: "/tournaments", icon: Trophy },
];

type DbCharacter = { id: string; name: string; tier: string; image_url: string | null; metadata: Record<string, unknown> };

type DbCombo = { id: string; name: string; tier: string; image_url: string | null; metadata: Record<string, unknown> };

type DbVehicle = { id: string; name: string; tier: string; image_url: string | null; metadata: Record<string, unknown> };

type WeaponItem = { id: string; name: string; tier: string; image_url: string | null; metadata: Record<string, unknown> };

type Props = {
  gameName: string;
  gameSlug: string;
  imageUrl: string;
  hudData?: LobbyHudData | null;
  currentUserId?: string | null;
  lobbyEffect?: { effect: string; color?: string } | null;
  ownedDbCombos?: DbCombo[];
  ownedDbCharacters?: DbCharacter[];
  ownedDbVehicles?: DbVehicle[];
  ownedWeapons?: WeaponItem[];
  initialLoadout?: Partial<LobbyLoadout>;
  hasDbLoadout?: boolean;
};

const DEFAULT_LOADOUT: LobbyLoadout = {
  combo: "combo_none",
  character: "leo",
  weapons: [],
  vehicle:   "icefire_sedan",
  lobby:     "lobby_svaneti",
  effect:    "fx_none",
  nameCard:  "nc_default",
};

const CHARACTER_URL = "/characters/gameroom-vanguard.png";
const LOBBY_RIDE_URL = "/lobby-assets/icefire-sedan-v3.png";
const CENTER_WEAPON_URL = "/weapons/m416-caucasus-icefire.png";
const CENTER_WEAPON_WIDTH = 2172;
const CENTER_WEAPON_HEIGHT = 724;
const START_WIDGET_BASE_WIDTH = 143;
const START_WIDGET_BASE_HEIGHT = 85;
const START_WIDGET_BASE_LEFT = lobbyX(10.35);
const START_WIDGET_BASE_BOTTOM = lobbyY(8);

export function LobbyStage({ gameName, gameSlug, imageUrl, hudData = null, currentUserId = null, lobbyEffect = null, ownedDbCombos = [], ownedDbCharacters = [], ownedDbVehicles = [], ownedWeapons = [], initialLoadout, hasDbLoadout = false }: Props) {
  const loadoutStorageKey = currentUserId ? getLobbyLoadoutStorageKey(gameSlug, currentUserId) : undefined;
  const [inventoryOpen, setInventoryOpen] = useState(false);

  return (
    <div data-lobby-stage className="absolute inset-0 overflow-hidden">
      <svg
        className="absolute inset-0 h-full w-full overflow-hidden"
        viewBox={`0 0 ${LOBBY_SCENE_WIDTH} ${LOBBY_SCENE_HEIGHT}`}
        preserveAspectRatio="none"
      >
        <foreignObject x="0" y="0" width={LOBBY_SCENE_WIDTH} height={LOBBY_SCENE_HEIGHT}>
          <div className="relative h-full w-full overflow-hidden">
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
            <LiveHud data={hudData} hideRightHud={inventoryOpen} />
            <StartWidget />
            <LobbyLoadoutLayer
              characterUrl={CHARACTER_URL}
              persistEnabled={Boolean(currentUserId)}
              storageKey={loadoutStorageKey}
              gameSlug={gameSlug}
              lobbyEffect={lobbyEffect}
              ownedDbCombos={ownedDbCombos}
              ownedDbCharacters={ownedDbCharacters}
              ownedDbVehicles={ownedDbVehicles}
              ownedWeapons={ownedWeapons}
              initialLoadout={initialLoadout}
              hasDbLoadout={hasDbLoadout}
              onInventoryOpenChange={setInventoryOpen}
            />
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}

function LobbyLoadoutLayer({
  characterUrl,
  persistEnabled,
  storageKey,
  gameSlug,
  lobbyEffect,
  ownedDbCombos,
  ownedDbCharacters,
  ownedDbVehicles,
  ownedWeapons,
  initialLoadout,
  hasDbLoadout,
  onInventoryOpenChange,
}: {
  characterUrl: string;
  persistEnabled: boolean;
  storageKey?: string;
  gameSlug: string;
  lobbyEffect?: { effect: string; color?: string } | null;
  ownedDbCombos?: DbCombo[];
  ownedDbCharacters?: DbCharacter[];
  ownedDbVehicles?: DbVehicle[];
  ownedWeapons?: WeaponItem[];
  initialLoadout?: Partial<LobbyLoadout>;
  hasDbLoadout: boolean;
  onInventoryOpenChange?: (open: boolean) => void;
}) {
  const [loadout, setLoadout] = useState<LobbyLoadout>(() =>
    initialLoadout ? { ...DEFAULT_LOADOUT, ...initialLoadout } : DEFAULT_LOADOUT
  );
  const showCenterWeapon = loadout.weapons.includes("m416_icefire");

  useEffect(() => {
    if (!persistEnabled || !storageKey) return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<LobbyLoadout>;
      const resolved = {
        combo: parsed.combo ?? DEFAULT_LOADOUT.combo,
        character: parsed.character ?? DEFAULT_LOADOUT.character,
        weapons: parsed.weapons ?? DEFAULT_LOADOUT.weapons,
        vehicle:   parsed.vehicle   ?? DEFAULT_LOADOUT.vehicle,
        lobby:     parsed.lobby     ?? DEFAULT_LOADOUT.lobby,
        effect:    parsed.effect    ?? DEFAULT_LOADOUT.effect,
        nameCard:  parsed.nameCard  ?? DEFAULT_LOADOUT.nameCard,
      };
      startTransition(() => {
        setLoadout(resolved);
      });
      if (!hasDbLoadout && gameSlug) {
        saveLobbyLoadout(gameSlug, resolved);
      }
    } catch {
      // ignore malformed data
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistEnabled, storageKey]);

  const dbCharMap = new Map(
    (ownedDbCharacters ?? []).map((c) => [
      (c.metadata.character_id as string) ?? c.id,
      c.image_url ?? undefined,
    ]),
  );
  const activeCharUrl = dbCharMap.get(loadout.character) ?? characterUrl;
  const dbVehicleMap = new Map(
    (ownedDbVehicles ?? []).map((v) => [
      (v.metadata.vehicle_id as string) ?? v.id,
      v.image_url ?? undefined,
    ]),
  );
  const activeRideUrl = dbVehicleMap.get(loadout.vehicle) ?? LOBBY_RIDE_URL;
  const activeCombo = (ownedDbCombos ?? []).find((combo) => {
    const comboId = typeof combo.metadata.combo_id === "string" && combo.metadata.combo_id.trim()
      ? combo.metadata.combo_id.trim()
      : combo.id;
    return comboId === loadout.combo;
  });
  const comboSceneUrl = typeof activeCombo?.metadata.scene_url === "string" && activeCombo.metadata.scene_url.trim()
    ? activeCombo.metadata.scene_url.trim()
    : activeCombo?.image_url ?? null;
  const hasActiveCombo = loadout.combo !== DEFAULT_LOADOUT.combo && !!comboSceneUrl;

  return (
    <>
      {(lobbyEffect?.effect === "fire_lobby" || loadout.effect === "fx_fire") && <LobbyCanvas />}
      {hasActiveCombo && comboSceneUrl ? (
        <Image
          src={comboSceneUrl}
          alt=""
          aria-hidden
          fill
          quality={85}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 92vw, 1152px"
          className="pointer-events-none absolute inset-0 z-[1] select-none object-cover object-center"
        />
      ) : (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute z-[1] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(5,10,20,0.68)_0%,rgba(5,10,20,0.42)_42%,rgba(5,10,20,0)_75%)] blur-[10px]"
            style={{
              left: "calc(63% - 260px)",
              bottom: "calc(3.2% + 80px)",
              width: "45%",
              height: "8%",
              transform: "translateX(-50%)",
            }}
          />
          <Image
            src={activeRideUrl}
            alt=""
            aria-hidden
            className="pointer-events-none absolute z-[2] h-auto select-none"
            width={1536}
            height={1024}
            sizes="(max-width: 640px) 68vw, (max-width: 1280px) 44vw, 700px"
            quality={75}
            style={{
              left: "calc(63% - 260px)",
              bottom: "calc(4.8% + 80px)",
              width: "45%",
              height: "auto",
              transform: "translateX(-50%)",
              transformOrigin: "50% 100%",
              opacity: 0.92,
              filter: "drop-shadow(0 18px 20px rgba(3, 8, 20, 0.55)) drop-shadow(0 0 24px rgba(56, 189, 248, 0.2))",
            }}
            draggable={false}
          />
          <svg
            aria-hidden
            className="absolute z-[3] pointer-events-none overflow-visible"
            viewBox="0 0 100 90"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            style={{
              left: "51.5%",
              bottom: "calc(0.5% - 40px)",
              width: "34%",
              height: "20%",
              transform: "translateX(-50%)",
            }}
          >
            <defs>
              <filter id="leg-shadow-blur" x="-40%" y="-20%" width="180%" height="140%">
                <feGaussianBlur stdDeviation="6.5" />
              </filter>
            </defs>
            <g transform="translate(-5 0.9)">
              <path
                d="M 39,5 C 35,5 29,18 16,68 L 14,78 C 20,83 31,84 36,80 L 38,55 Z"
                fill="black"
                opacity="0.70"
                filter="url(#leg-shadow-blur)"
              />
            </g>
            <g transform="translate(5 0.9)">
              <path
                d="M 50,5 C 54,5 61,18 74,68 L 76,78 C 70,83 59,84 54,80 L 52,55 Z"
                fill="black"
                opacity="0.70"
                filter="url(#leg-shadow-blur)"
              />
            </g>
            <path
              d="M 36,54 C 36,65 39,75 45,87 C 51,75 54,65 54,54 C 50,51 40,51 36,54 Z"
              fill="black"
              opacity="0.65"
              filter="url(#leg-shadow-blur)"
              transform="translate(0 50)"
            />
          </svg>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeCharUrl}
            alt=""
            aria-hidden="true"
            className="absolute z-[4] h-auto w-auto max-w-none select-none pointer-events-none"
            style={{
              left: loadout.character !== "leo" ? "49.5%" : "51.5%",
              bottom: "calc(6% + 10px)",
              height: "calc(86% - 90px)",
              transform: "translateX(-50%)",
              transformOrigin: "50% 100%",
              maskImage: "linear-gradient(to top, transparent 0px, black 10px)",
              WebkitMaskImage: "linear-gradient(to top, transparent 0px, black 10px)",
            }}
            draggable={false}
          />
        </>
      )}

      {showCenterWeapon && !hasActiveCombo ? (
        <Image
          src={CENTER_WEAPON_URL}
          alt=""
          aria-hidden
          width={CENTER_WEAPON_WIDTH}
          height={CENTER_WEAPON_HEIGHT}
          quality={90}
          draggable={false}
          className="pointer-events-none absolute z-[1000] h-auto select-none"
          style={{
            right: "calc(2.5% + 45px)",
            top: "calc(34% + 140px)",
            width: "calc(12% - 40px)",
            height: "auto",
            transform: "rotate(-1deg)",
            transformOrigin: "50% 50%",
            opacity: 0.98,
            filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.6)) drop-shadow(0 0 16px rgba(0,0,0,0.32))",
          }}
        />
      ) : null}

      {(lobbyEffect?.effect === "fire_lobby" || loadout.effect === "fx_fire") && <LobbyFireEffect />}
      {!hasActiveCombo ? (
        <LobbyWeaponStand 
          weapons={(ownedWeapons || [])
            .filter((w, i, arr) => {
              if (w.name?.toLowerCase().includes("icefire") || w.metadata?.weapon_id === "m416_icefire") {
                const hasNewIcefire = arr.some(ow => ow.metadata?.weapon_id === "m416_icefire");
                if (hasNewIcefire && w.metadata?.weapon_id !== "m416_icefire") return false;
              }
              return loadout.weapons.includes((w.metadata?.weapon_id as string) ?? w.id);
            })} 
        />
      ) : null}
      {persistEnabled && (
        <LobbyInventory
          key={storageKey ?? "guest-lobby"}
          initialLoadout={loadout}
          onLoadoutChange={setLoadout}
          persistEnabled={persistEnabled}
          storageKey={storageKey}
          gameSlug={gameSlug}
          ownedDbCombos={ownedDbCombos}
          ownedDbCharacters={ownedDbCharacters}
          ownedDbVehicles={ownedDbVehicles}
          ownedWeapons={ownedWeapons}
          onOpenChange={onInventoryOpenChange}
        />
      )}
    </>
  );
}

function LiveHud({ data, hideRightHud }: { data: LobbyHudData | null, hideRightHud?: boolean }) {
  return <LobbyHud data={data} hideRightHud={hideRightHud} />;
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
      className="absolute z-[5] overflow-visible"
      style={{
        left: `${START_WIDGET_BASE_LEFT}px`,
        bottom: `${START_WIDGET_BASE_BOTTOM}px`,
        width: `${START_WIDGET_BASE_WIDTH}px`,
        height: `${START_WIDGET_BASE_HEIGHT}px`,
        transform: `scale(${LOBBY_UI_SCALE})`,
        transformOrigin: "left bottom",
      }}
    >
      <div
        className="overflow-visible shadow-[0_4px_24px_rgba(0,0,0,0.7)]"
        style={{
          width: `${START_WIDGET_BASE_WIDTH}px`,
        }}
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
          className="flex w-full items-center justify-between bg-black/70 px-2 py-1 backdrop-blur-sm transition-colors hover:bg-black/85"
        >
          <span className="text-[7px] font-bold uppercase tracking-[0.16em] text-white/80">
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
          className="flex w-full items-center gap-1 bg-black/55 px-2 py-1 backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          <SelectedIcon className="h-3 w-3 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-[9px] font-bold leading-none text-white">
              {selected.label}
            </div>
            <div className="mt-0.5 text-[6px] leading-none text-white/45">
              არჩეული რეჟიმი
            </div>
          </div>
        </button>

        {/* START button — navigates to selected mode's page */}
        <button
          type="button"
          onClick={() => router.push(selected.href)}
          className="block w-full py-2 text-center font-display text-[16px] font-black uppercase tracking-[0.22em] text-black transition-[filter,transform] hover:brightness-110 active:scale-[0.97]"
          style={{
            background: "linear-gradient(180deg, #f5c842 0%, #e6a800 55%, #c87f00 100%)",
            textShadow: "0 1px 0 rgba(255,255,255,0.25)",
          }}
        >
          START
        </button>
      </div>
    </div>
  );
}
