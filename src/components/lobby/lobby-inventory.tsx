"use client";

import { useRef, useState } from "react";
import { Package, X, Check, User, Dices, Save, Flame, Monitor, CreditCard, CheckCheck } from "lucide-react";
import { LobbyItemTooltip } from "@/components/lobby/lobby-item-tooltip";
import { LobbyFireEffect } from "@/components/lobby/lobby-fire-effect";
import { saveLobbyLoadout } from "@/lib/lobby/loadout-actions";

export type LobbyInventoryTier = "common" | "rare" | "epic" | "legendary";

export type LobbyInventoryItem = {
  id: string;
  name: string;
  tier: LobbyInventoryTier;
  /** Optional asset URL (PNG with transparent bg). When wired, applies to the lobby canvas. */
  asset?: string;
  /** Per-character face-zoom positioning for inventory thumbnail */
  thumbnailObjectPosition?: string;
  thumbnailTransformOrigin?: string;
};

const CHARACTERS: LobbyInventoryItem[] = [
  { id: "leo", name: "LEO", tier: "legendary", asset: "/characters/gameroom-vanguard.png", thumbnailObjectPosition: "35% -3%", thumbnailTransformOrigin: "35% 4%" },
];

const LOBBY_ITEMS: LobbyInventoryItem[] = [
  { id: "lobby_svaneti", name: "სვანეთი", tier: "common", asset: "/lobbies/pubg-mobile-optimized.jpg" },
];

const EFFECTS_ITEMS: LobbyInventoryItem[] = [
  { id: "fx_none", name: "Default", tier: "common" },
  { id: "fx_fire", name: "ცეცხლოვანი", tier: "common", asset: "/lobbies/pubg-mobile-optimized.jpg" },
];

const NAME_CARD_ITEMS: LobbyInventoryItem[] = [];

const OWNED_CHARACTER_IDS = new Set(["leo"]);
const OWNED_LOBBY_IDS     = new Set(LOBBY_ITEMS.map((i) => i.id));
const OWNED_EFFECTS_IDS   = new Set(EFFECTS_ITEMS.map((i) => i.id));
const OWNED_NAME_CARD_IDS = new Set(NAME_CARD_ITEMS.map((i) => i.id));

const OWNED_BY_TAB = {
  characters: OWNED_CHARACTER_IDS,
  lobby:      OWNED_LOBBY_IDS,
  effects:    OWNED_EFFECTS_IDS,
  name_card:  OWNED_NAME_CARD_IDS,
} as const;

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

export type LobbyInventoryTab = "characters" | "lobby" | "effects" | "name_card";

export type LobbyLoadout = {
  character: string;
  lobby: string;
  effect: string;
  nameCard: string;
};

const TABS: { id: LobbyInventoryTab; label: string; icon: typeof User; items: LobbyInventoryItem[] }[] = [
  { id: "characters", label: "გმირები",  icon: User,       items: CHARACTERS },
  { id: "lobby",      label: "ლობი",     icon: Monitor,    items: LOBBY_ITEMS },
  { id: "effects",    label: "ეფექტები", icon: Flame,      items: EFFECTS_ITEMS },
  { id: "name_card",  label: "Name Card",icon: CreditCard, items: NAME_CARD_ITEMS },
];

const cutSm = "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)";

type DbCharacterProp = { id: string; name: string; tier: string; image_url: string | null; metadata: Record<string, unknown> };

type Props = {
  initialLoadout?: Partial<LobbyLoadout>;
  onLoadoutChange?: (loadout: LobbyLoadout) => void;
  onPreviewItem?: (item: LobbyInventoryItem, tab: LobbyInventoryTab, loadout: LobbyLoadout) => void;
  persistEnabled?: boolean;
  storageKey?: string;
  gameSlug?: string;
  ownedDbCharacters?: DbCharacterProp[];
};

const LOADOUT_STORAGE_KEY = "lobby:loadout";

function buildLoadout(sel: Record<LobbyInventoryTab, string>): LobbyLoadout {
  return {
    character: sel.characters,
    lobby:     sel.lobby,
    effect:    sel.effects,
    nameCard:  sel.name_card,
  };
}

function getSelectedFromLoadout(initialLoadout?: Partial<LobbyLoadout>) {
  return {
    characters: initialLoadout?.character && OWNED_CHARACTER_IDS.has(initialLoadout.character)
      ? initialLoadout.character
      : "leo",
    lobby:     initialLoadout?.lobby   && OWNED_LOBBY_IDS.has(initialLoadout.lobby)
      ? initialLoadout.lobby
      : LOBBY_ITEMS[0]?.id ?? "",
    effects:   initialLoadout?.effect  && OWNED_EFFECTS_IDS.has(initialLoadout.effect)
      ? initialLoadout.effect
      : EFFECTS_ITEMS[0]?.id ?? "",
    name_card: initialLoadout?.nameCard && OWNED_NAME_CARD_IDS.has(initialLoadout.nameCard)
      ? initialLoadout.nameCard
      : NAME_CARD_ITEMS[0]?.id ?? "",
  };
}

function getInitialSelected(
  initialLoadout: Partial<LobbyLoadout> | undefined,
  persistEnabled: boolean,
  storageKey: string,
  extraCharIds: Set<string> = new Set(),
) {
  const fallback = getSelectedFromLoadout(initialLoadout);

  if (!persistEnabled || typeof window === "undefined") {
    const allCharIds = extraCharIds.size > 0
      ? new Set([...OWNED_CHARACTER_IDS, ...extraCharIds])
      : OWNED_CHARACTER_IDS;
    return {
      characters: initialLoadout?.character && allCharIds.has(initialLoadout.character)
        ? initialLoadout.character
        : fallback.characters,
      lobby:     fallback.lobby,
      effects:   fallback.effects,
      name_card: fallback.name_card,
    };
  }

  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return fallback;

    const parsed = JSON.parse(saved) as Partial<LobbyLoadout>;
    const allCharIds = extraCharIds.size > 0
      ? new Set([...OWNED_CHARACTER_IDS, ...extraCharIds])
      : OWNED_CHARACTER_IDS;

    return {
      characters: parsed.character && allCharIds.has(parsed.character)
        ? parsed.character
        : fallback.characters,
      lobby:     parsed.lobby    && OWNED_LOBBY_IDS.has(parsed.lobby)
        ? parsed.lobby
        : fallback.lobby,
      effects:   parsed.effect   && OWNED_EFFECTS_IDS.has(parsed.effect)
        ? parsed.effect
        : fallback.effects,
      name_card: parsed.nameCard && OWNED_NAME_CARD_IDS.has(parsed.nameCard)
        ? parsed.nameCard
        : fallback.name_card,
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
  gameSlug,
  ownedDbCharacters = [],
}: Props = {}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<LobbyInventoryTab>("characters");
  const [selected, setSelected] = useState<Record<LobbyInventoryTab, string>>(() => {
    const dbCharIds = new Set(
      ownedDbCharacters.map((c) => (c.metadata.character_id as string) ?? c.id),
    );
    return getInitialSelected(initialLoadout, persistEnabled, storageKey, dbCharIds);
  });
  const [tooltipId, setTooltipId] = useState<string | null>(null);
  const [randomizing, setRandomizing] = useState(false);
  const [saved, setSaved] = useState(false);
  const longPressRef = useRef<number | null>(null);

  const dbCharItems: LobbyInventoryItem[] = ownedDbCharacters.map((c) => ({
    id: (c.metadata.character_id as string) ?? c.id,
    name: c.name,
    tier: c.tier as LobbyInventoryTier,
    asset: c.image_url ?? undefined,
    thumbnailObjectPosition: (c.metadata.thumbnail_object_position as string) ?? "53% -1%",
    thumbnailTransformOrigin: (c.metadata.thumbnail_transform_origin as string) ?? "53% 3%",
  }));

  const allTabItems = tab === "characters"
    ? [...CHARACTERS, ...dbCharItems.filter((c) => !CHARACTERS.some((h) => h.id === c.id))]
    : TABS.find((t) => t.id === tab)?.items ?? [];

  const activeItems = tab === "characters"
    ? allTabItems
    : allTabItems.filter((item) => OWNED_BY_TAB[tab].has(item.id));

  const applySelection = (next: Record<LobbyInventoryTab, string>, changedTab: LobbyInventoryTab, item: LobbyInventoryItem) => {
    const loadout = buildLoadout(next);
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
        const ownedSet = OWNED_BY_TAB[entry.id];
        const availableItems = entry.items.filter((item) => ownedSet.has(item.id));
        const item = availableItems[Math.floor(Math.random() * availableItems.length)] ?? availableItems[0];
        if (!item) return;

        setSelected((current) => {
          const next = { ...current, [entry.id]: item.id };
          const loadout = buildLoadout(next);
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

  const savePreset = async () => {
    if (!persistEnabled) return;
    const loadoutData = buildLoadout(selected);
    window.localStorage.setItem(storageKey, JSON.stringify(loadoutData));
    if (gameSlug) {
      await saveLobbyLoadout(gameSlug, loadoutData);
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
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
            <div className="mb-3 flex gap-0.5 border-b border-[var(--gr-border)]">
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`relative flex flex-1 items-center justify-center gap-1 px-1 py-2 text-[9px] font-semibold uppercase tracking-[0.10em] transition-colors sm:text-[10px] ${
                      active ? "text-white" : "text-[var(--gr-text-mute)] hover:text-white"
                    }`}
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{label}</span>
                    {active && (
                      <span aria-hidden className="absolute inset-x-1 -bottom-px h-[2px] bg-[var(--gr-violet)] shadow-[0_0_8px_rgba(139,92,246,0.7)]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* empty state */}
            {activeItems.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Package className="h-8 w-8 text-[var(--gr-text-mute)] opacity-40" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--gr-text-mute)]">
                  ჯერ არ გაქვს ამ კატეგორიის აიტემი
                </p>
                <p className="text-[10px] text-[var(--gr-text-dim)]">
                  შეიძინე{" "}
                  <span className="font-bold text-[var(--gr-violet-hi)]">შოპიდან</span>
                </p>
              </div>
            )}

            {/* grid */}
            <div className="grid grid-cols-4 gap-2">
              {activeItems.map((item) => {
                const isSelected = selected[tab] === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      applySelection({ ...selected, [tab]: item.id }, tab, item);
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
                    className={`group relative ${tab === "characters" ? "aspect-[3/4]" : "aspect-square"} overflow-visible ring-1 transition-all hover:scale-[1.04] ${
                      isSelected
                        ? `ring-2 ${TIER_RING[item.tier]} shadow-[0_0_16px_rgba(139,92,246,0.5)]`
                        : "ring-[var(--gr-border)] hover:ring-[var(--gr-border-hi)]"
                    }`}
                    title={`${item.name} · ${TIER_LABEL[item.tier]}`}
                  >
                    {/* tier gradient background */}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-0 bg-gradient-to-br ${TIER_GRADIENT[item.tier]}`}
                      style={{ clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)" }}
                    />
                    {item.id === "fx_none" ? (
                      <span aria-hidden="true" className="absolute inset-0 z-10 grid place-items-center">
                        <span className="text-[22px] font-black text-white/30">∅</span>
                      </span>
                    ) : item.asset ? (
                      <span aria-hidden="true" className="absolute inset-0 z-10 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.asset}
                          alt=""
                          draggable={false}
                          className="h-full w-full object-cover"
                          style={tab === "characters"
                            ? { objectPosition: item.thumbnailObjectPosition ?? "35% -3%", transform: "scale(2.2)", transformOrigin: item.thumbnailTransformOrigin ?? "35% 4%" }
                            : { objectPosition: "center" }}
                        />
                        {tab === "effects" && (
                          <span
                            style={{
                              position: "absolute",
                              width: 600,
                              height: 300,
                              bottom: 0,
                              left: "50%",
                              transform: "translateX(-50%) scale(0.14)",
                              transformOrigin: "bottom center",
                            }}
                          >
                            <LobbyFireEffect />
                          </span>
                        )}
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
                className={`inline-flex h-9 items-center justify-center gap-2 px-3 text-[10px] font-black uppercase tracking-[0.14em] ring-1 transition disabled:cursor-not-allowed disabled:opacity-45 ${
                  saved
                    ? "bg-[color-mix(in_srgb,var(--gr-amber)_30%,transparent)] text-white ring-[var(--gr-amber)]"
                    : "bg-[color-mix(in_srgb,var(--gr-amber)_16%,transparent)] text-[var(--gr-amber)] ring-[color-mix(in_srgb,var(--gr-amber)_42%,transparent)] hover:bg-[color-mix(in_srgb,var(--gr-amber)_24%,transparent)]"
                }`}
                style={{ clipPath: cutSm }}
              >
                {saved ? <><CheckCheck className="h-3.5 w-3.5" /> შენახულია</> : <><Save className="h-3.5 w-3.5" /> Save Preset</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
