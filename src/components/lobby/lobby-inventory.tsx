"use client";

import { useRef, useState } from "react";
import { Package, X, Check, User, Dices, Save, Lock } from "lucide-react";
import { LobbyItemTooltip } from "@/components/lobby/lobby-item-tooltip";

export type LobbyInventoryTier = "common" | "rare" | "epic" | "legendary";

export type LobbyInventoryItem = {
  id: string;
  name: string;
  tier: LobbyInventoryTier;
  /** Optional asset URL (PNG with transparent bg). When wired, applies to the lobby canvas. */
  asset?: string;
};

const CHARACTERS: LobbyInventoryItem[] = [
  { id: "leo", name: "LEO", tier: "legendary", asset: "/characters/gameroom-vanguard.png" },
];

const OWNED_CHARACTER_IDS = new Set(["leo"]);


const TIER_RING: Record<LobbyInventoryTier, string> = {
  common:    "ring-[var(--gr-text-mute)]",
  rare:      "ring-[var(--gr-cyan-glow)]",
  epic:      "ring-[var(--gr-violet-hi)]",
  legendary: "ring-[var(--gr-amber)]",
};

const TIER_GRADIENT: Record<LobbyInventoryTier, string> = {
  common:    "from-slate-700 to-slate-900",
  rare:      "from-cyan-700 to-cyan-950",
  epic:      "from-violet-700 to-violet-950",
  legendary: "from-amber-600 to-orange-900",
};

const TIER_LABEL: Record<LobbyInventoryTier, string> = {
  common:    "ჩვეულებრივი",
  rare:      "იშვიათი",
  epic:      "ეპიკური",
  legendary: "ლეგენდარული",
};

export type LobbyInventoryTab = "characters";

export type LobbyLoadout = {
  character: string;
};

const TABS: { id: LobbyInventoryTab; label: string; icon: typeof User; items: LobbyInventoryItem[] }[] = [
  { id: "characters", label: "გმირები", icon: User, items: CHARACTERS },
];

const cutSm = "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)";

type Props = {
  initialLoadout?: LobbyLoadout;
  onLoadoutChange?: (loadout: LobbyLoadout) => void;
  onPreviewItem?: (item: LobbyInventoryItem, tab: LobbyInventoryTab, loadout: LobbyLoadout) => void;
  persistEnabled?: boolean;
  storageKey?: string;
};

const LOADOUT_STORAGE_KEY = "lobby:loadout";

function getSelectedFromLoadout(initialLoadout?: LobbyLoadout) {
  return {
    characters: initialLoadout?.character && OWNED_CHARACTER_IDS.has(initialLoadout.character)
      ? initialLoadout.character
      : "leo",
  };
}

function getInitialSelected(
  initialLoadout: LobbyLoadout | undefined,
  persistEnabled: boolean,
  storageKey: string,
) {
  const fallback = getSelectedFromLoadout(initialLoadout);

  if (!persistEnabled || typeof window === "undefined") {
    return fallback;
  }

  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
      return fallback;
    }

    const parsed = JSON.parse(saved) as Partial<LobbyLoadout>;
    const savedCharacter =
      parsed.character && OWNED_CHARACTER_IDS.has(parsed.character) ? parsed.character : fallback.characters;

    return {
      characters: savedCharacter,
    };
  } catch {
    window.localStorage.removeItem(storageKey);
    return fallback;
  }
}

export function LobbyInventory({
  initialLoadout,
  onLoadoutChange,
  onPreviewItem,
  persistEnabled = true,
  storageKey = LOADOUT_STORAGE_KEY,
}: Props = {}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<LobbyInventoryTab>("characters");
  const [selected, setSelected] = useState<Record<LobbyInventoryTab, string>>(() =>
    getInitialSelected(initialLoadout, persistEnabled, storageKey),
  );
  const [tooltipId, setTooltipId] = useState<string | null>(null);
  const [randomizing, setRandomizing] = useState(false);
  const longPressRef = useRef<number | null>(null);

  const activeItems = TABS.find((t) => t.id === tab)?.items ?? [];

  const applySelection = (next: Record<LobbyInventoryTab, string>, changedTab: LobbyInventoryTab, item: LobbyInventoryItem) => {
    const loadout = {
      character: next.characters,
    };

    setSelected(next);
    onLoadoutChange?.(loadout);
    onPreviewItem?.(item, changedTab, loadout);
  };

  const clearLongPress = () => {
    if (longPressRef.current !== null) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const randomizeLoadout = () => {
    setRandomizing(true);
    TABS.forEach((entry, index) => {
      window.setTimeout(() => {
        const availableItems =
          entry.id === "characters"
            ? entry.items.filter((item) => OWNED_CHARACTER_IDS.has(item.id))
            : entry.items;
        const item = availableItems[Math.floor(Math.random() * availableItems.length)] ?? availableItems[0];
        if (!item) {
          return;
        }

        setSelected((current) => {
          const next = { ...current, [entry.id]: item.id };
          const loadout = {
            character: next.characters,
          };

          onLoadoutChange?.(loadout);
          onPreviewItem?.(item, entry.id, loadout);
          return next;
        });

        if (index === TABS.length - 1) {
          window.setTimeout(() => setRandomizing(false), 180);
        }
      }, index * 60);
    });
  };

  const savePreset = () => {
    if (!persistEnabled) {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        character: selected.characters,
      }),
    );
  };

  return (
    <>
      {/* Trigger chip — bottom-right of the lobby card */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1.5 bg-black/55 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/85 ring-1 ring-white/15 backdrop-blur-md transition-all hover:bg-black/70 hover:text-white hover:ring-[var(--gr-violet-hi)] sm:bottom-4 sm:right-4 sm:gap-2 sm:px-3 sm:py-2 sm:text-[11px]"
        style={{ clipPath: cutSm }}
      >
        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        ინვენტარი
      </button>

      {/* Panel — slides up over the bottom-right area */}
      {open && (
        <div
          role="dialog"
          aria-label="ინვენტარი"
          className="absolute inset-0 z-20 flex items-end justify-end p-2 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          {/* dim the canvas behind */}
          <span aria-hidden className="absolute inset-0 bg-black/40 backdrop-blur-md" />

          <div
            className="relative w-full max-w-md bg-[var(--gr-bg-1)]/95 p-3 ring-1 ring-[var(--gr-border-hi)] backdrop-blur-xl sm:p-4"
            style={{ clipPath: cutSm }}
          >
            {/* header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-[var(--gr-violet-hi)]" />
                <span className="font-display text-[14px] font-bold uppercase tracking-tight text-[var(--gr-text)]">
                  ინვენტარი
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="დახურვა"
                className="grid h-7 w-7 place-items-center text-[var(--gr-text-mute)] transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* tabs */}
            <div className="mb-3 flex gap-1 border-b border-[var(--gr-border)]">
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`relative flex flex-1 items-center justify-center gap-1.5 px-1.5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors sm:text-[11px] ${
                      active ? "text-white" : "text-[var(--gr-text-mute)] hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    {active && (
                      <span aria-hidden className="absolute inset-x-1 -bottom-px h-[2px] bg-[var(--gr-violet)] shadow-[0_0_8px_rgba(139,92,246,0.7)]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* grid */}
            <div className="grid grid-cols-4 gap-2">
              {activeItems.map((item) => {
                const isSelected = selected[tab] === item.id;
                const isLocked = tab === "characters" && !OWNED_CHARACTER_IDS.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isLocked}
                    onClick={() => {
                      if (isLocked) {
                        return;
                      }

                      const next = { ...selected, [tab]: item.id };
                      applySelection(next, tab, item);
                    }}
                    onPointerEnter={() => setTooltipId(item.id)}
                    onPointerLeave={() => {
                      clearLongPress();
                      setTooltipId(null);
                    }}
                    onPointerDown={() => {
                      clearLongPress();
                      longPressRef.current = window.setTimeout(() => setTooltipId(item.id), 420);
                    }}
                    onPointerUp={clearLongPress}
                    onPointerCancel={() => {
                      clearLongPress();
                      setTooltipId(null);
                    }}
                    onFocus={() => setTooltipId(item.id)}
                    onBlur={() => setTooltipId(null)}
                    className={`group relative aspect-square overflow-visible ring-1 transition-all ${
                      isLocked
                        ? "cursor-not-allowed opacity-45 grayscale"
                        : "hover:scale-[1.04]"
                    } ${
                      isSelected
                        ? `ring-2 ${TIER_RING[item.tier]} shadow-[0_0_16px_rgba(139,92,246,0.5)]`
                        : "ring-[var(--gr-border)] hover:ring-[var(--gr-border-hi)]"
                    }`}
                    title={isLocked ? `${item.name} · Shop` : `${item.name} · ${TIER_LABEL[item.tier]}`}
                  >
                    {/* tier gradient background */}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-0 bg-gradient-to-br ${TIER_GRADIENT[item.tier]}`}
                      style={{ clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)" }}
                    />
                    {item.asset ? (
                      <span aria-hidden="true" className="absolute inset-0 z-10 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.asset}
                          alt=""
                          draggable={false}
                          className="h-full w-full object-cover"
                          style={{ objectPosition: "35% -3%", transform: "scale(2.2)", transformOrigin: "35% 4%" }}
                        />
                      </span>
                    ) : (
                      <span className="absolute inset-0 z-10 grid place-items-center font-display text-[20px] font-extrabold uppercase text-white/85"
                        style={{ textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}
                      >
                        {item.name.slice(0, 1)}
                      </span>
                    )}
                    {isSelected && (
                      <span className="absolute right-0.5 top-0.5 z-20 grid h-4 w-4 place-items-center bg-[var(--gr-violet)] text-white shadow-[0_0_8px_rgba(139,92,246,0.7)]">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                    {isLocked && (
                      <span className="absolute right-0.5 top-0.5 z-20 grid h-4 w-4 place-items-center bg-black/70 text-[var(--gr-amber)] ring-1 ring-[color-mix(in_srgb,var(--gr-amber)_40%,transparent)]">
                        <Lock className="h-2.5 w-2.5" />
                      </span>
                    )}
                    {tooltipId === item.id ? <LobbyItemTooltip item={item} tab={tab} /> : null}
                  </button>
                );
              })}
            </div>

            {/* selected item details */}
            {(() => {
              const item = activeItems.find((i) => i.id === selected[tab]);
              if (!item) return null;
              return (
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--gr-border)] pt-3">
                  <div className="min-w-0">
                    <div className="truncate font-display text-[13px] font-bold uppercase tracking-tight text-white">
                      {item.name}
                    </div>
                    <div className={`text-[9px] uppercase tracking-[0.18em] ${item.tier === "legendary" ? "text-[var(--gr-amber)]" : item.tier === "epic" ? "text-[var(--gr-violet-hi)]" : item.tier === "rare" ? "text-[var(--gr-cyan-glow)]" : "text-[var(--gr-text-mute)]"}`}>
                      {TIER_LABEL[item.tier]}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 bg-[var(--gr-grad-violet)] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white"
                    style={{ clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)" }}
                  >
                    <Check className="h-3 w-3" />
                    არჩეული
                  </span>
                </div>
              );
            })()}

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--gr-border)] pt-3">
              <button
                type="button"
                onClick={randomizeLoadout}
                disabled={randomizing}
                className="inline-flex h-9 items-center justify-center gap-2 bg-[color-mix(in_srgb,var(--gr-cyan-glow)_16%,transparent)] px-3 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--gr-cyan-glow)] ring-1 ring-[color-mix(in_srgb,var(--gr-cyan-glow)_42%,transparent)] transition hover:bg-[color-mix(in_srgb,var(--gr-cyan-glow)_24%,transparent)] disabled:opacity-60"
                style={{ clipPath: cutSm }}
              >
                <Dices className="h-3.5 w-3.5" />
                Randomize
              </button>
              <button
                type="button"
                onClick={savePreset}
                disabled={!persistEnabled}
                className="inline-flex h-9 items-center justify-center gap-2 bg-[color-mix(in_srgb,var(--gr-amber)_16%,transparent)] px-3 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--gr-amber)] ring-1 ring-[color-mix(in_srgb,var(--gr-amber)_42%,transparent)] transition hover:bg-[color-mix(in_srgb,var(--gr-amber)_24%,transparent)] disabled:cursor-not-allowed disabled:opacity-45"
                style={{ clipPath: cutSm }}
              >
                <Save className="h-3.5 w-3.5" />
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
