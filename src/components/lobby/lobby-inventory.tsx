"use client";

import { useEffect, useRef, useState } from "react";
import { Package, X, Check, User, Dices, Save, Flame, Monitor, CreditCard, CheckCheck, CarFront, Crown, Crosshair } from "lucide-react";
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

const COMBO_ITEMS: LobbyInventoryItem[] = [
  { id: "combo_none", name: "Default", tier: "common" },
];

const VEHICLE_ITEMS: LobbyInventoryItem[] = [
  { id: "vehicle_none", name: "Default", tier: "common" },
];

const LOBBY_ITEMS: LobbyInventoryItem[] = [
  { id: "lobby_svaneti", name: "სვანეთი", tier: "common", asset: "/lobbies/pubg-mobile-optimized.jpg" },
];

const EFFECTS_ITEMS: LobbyInventoryItem[] = [
  { id: "fx_none", name: "Default", tier: "common" },
  { id: "fx_fire", name: "ცეცხლოვანი", tier: "common", asset: "/lobbies/pubg-mobile-optimized.jpg" },
];

const WEAPONS_ITEMS: LobbyInventoryItem[] = [
  { id: "m416_icefire", name: "M416 Caucasus Icefire", tier: "legendary", asset: "/weapons/m416-caucasus-icefire.png" },
];

const NAME_CARD_ITEMS: LobbyInventoryItem[] = [];

const OWNED_CHARACTER_IDS = new Set(["leo"]);
const OWNED_COMBO_IDS     = new Set(COMBO_ITEMS.map((i) => i.id));
const OWNED_VEHICLE_IDS   = new Set<string>(["vehicle_none"]);
const OWNED_WEAPON_IDS    = new Set<string>(["m416_icefire"]);
const OWNED_LOBBY_IDS     = new Set(LOBBY_ITEMS.map((i) => i.id));
const OWNED_EFFECTS_IDS   = new Set(EFFECTS_ITEMS.map((i) => i.id));
const OWNED_NAME_CARD_IDS = new Set(NAME_CARD_ITEMS.map((i) => i.id));

const OWNED_BY_TAB = {
  characters: OWNED_CHARACTER_IDS,
  combo:      OWNED_COMBO_IDS,
  weapons:    OWNED_WEAPON_IDS,
  vehicles:   OWNED_VEHICLE_IDS,
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

const TIER_BORDER: Record<LobbyInventoryTier, string> = {
  common:    "border-slate-800",
  rare:      "border-cyan-500/40",
  epic:      "border-violet-500/40",
  legendary: "border-amber-500/40",
};

const TIER_BG: Record<LobbyInventoryTier, string> = {
  common:    "bg-slate-950/40",
  rare:      "bg-cyan-950/30",
  epic:      "bg-violet-950/30",
  legendary: "bg-amber-950/20",
};

const TIER_GLOW: Record<LobbyInventoryTier, string> = {
  common:    "hover:shadow-[0_0_10px_rgba(148,163,184,0.1)]",
  rare:      "hover:shadow-[0_0_15px_rgba(34,211,238,0.25)]",
  epic:      "hover:shadow-[0_0_15px_rgba(168,85,247,0.25)]",
  legendary: "hover:shadow-[0_0_15px_rgba(245,165,36,0.25)]",
};

const TIER_LABEL_BG: Record<LobbyInventoryTier, string> = {
  common:    "bg-slate-500/20 text-slate-300",
  rare:      "bg-cyan-500/20 text-cyan-300",
  epic:      "bg-violet-500/20 text-violet-300",
  legendary: "bg-amber-500/20 text-amber-300",
};

export type LobbyInventoryTab = "characters" | "combo" | "weapons" | "vehicles" | "lobby" | "effects" | "name_card";

export type LobbyLoadout = {
  combo: string;
  character: string;
  weapons: string[];
  vehicle: string;
  lobby: string;
  effect: string;
  nameCard: string;
};

const TABS: { id: LobbyInventoryTab; label: string; icon: typeof User; items: LobbyInventoryItem[] }[] = [
  { id: "characters", label: "გმირები",  icon: User,       items: CHARACTERS },
  { id: "combo",      label: "კომბო",    icon: Crown,      items: COMBO_ITEMS },
  { id: "weapons",    label: "იარაღები", icon: Crosshair,  items: WEAPONS_ITEMS },
  { id: "vehicles",   label: "ტრანსპორტი", icon: CarFront, items: VEHICLE_ITEMS },
  { id: "lobby",      label: "ლობი",     icon: Monitor,    items: LOBBY_ITEMS },
  { id: "effects",    label: "ეფექტები", icon: Flame,      items: EFFECTS_ITEMS },
  { id: "name_card",  label: "Name Card",icon: CreditCard, items: NAME_CARD_ITEMS },
];

const cutSm = "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)";

type DbInventoryProp = { id: string; name: string; tier: string; image_url: string | null; metadata?: Record<string, unknown> };

type Props = {
  initialLoadout?: Partial<LobbyLoadout>;
  /** When true, initialLoadout came from the DB and takes priority over localStorage. */
  hasDbLoadout?: boolean;
  onLoadoutChange?: (loadout: LobbyLoadout) => void;
  onPreviewItem?: (item: LobbyInventoryItem, tab: LobbyInventoryTab, loadout: LobbyLoadout) => void;
  persistEnabled?: boolean;
  storageKey?: string;
  gameSlug?: string;
  ownedDbCombos?: DbInventoryProp[];
  ownedDbCharacters?: DbInventoryProp[];
  ownedDbVehicles?: DbInventoryProp[];
  ownedWeapons?: DbInventoryProp[];
  onOpenChange?: (open: boolean) => void;
};

const LOADOUT_STORAGE_KEY = "lobby:loadout";

export type SelectedState = {
  combo: string;
  characters: string;
  weapons: string[];
  vehicles: string;
  lobby: string;
  effects: string;
  name_card: string;
};

function buildLoadout(sel: SelectedState): LobbyLoadout {
  return {
    combo: sel.combo,
    character: sel.characters,
    weapons:   sel.weapons,
    vehicle:   sel.vehicles,
    lobby:     sel.lobby,
    effect:    sel.effects,
    nameCard:  sel.name_card,
  };
}

function getSelectedFromLoadout(
  initialLoadout?: Partial<LobbyLoadout>,
  extraComboIds: Set<string> = new Set(),
  extraCharIds: Set<string> = new Set(),
  extraVehicleIds: Set<string> = new Set(),
  extraWeaponIds: Set<string> = new Set(),
) {
  const allComboIds = extraComboIds.size > 0
    ? new Set([...OWNED_COMBO_IDS, ...extraComboIds])
    : OWNED_COMBO_IDS;
  const allCharIds = extraCharIds.size > 0
    ? new Set([...OWNED_CHARACTER_IDS, ...extraCharIds])
    : OWNED_CHARACTER_IDS;
  const allVehicleIds = extraVehicleIds.size > 0
    ? new Set([...OWNED_VEHICLE_IDS, ...extraVehicleIds])
    : OWNED_VEHICLE_IDS;
  const allWeaponIds = extraWeaponIds.size > 0
    ? new Set([...OWNED_WEAPON_IDS, ...extraWeaponIds])
    : OWNED_WEAPON_IDS;

  return {
    combo: initialLoadout?.combo && allComboIds.has(initialLoadout.combo)
      ? initialLoadout.combo
      : "combo_none",
    characters: initialLoadout?.character && allCharIds.has(initialLoadout.character)
      ? initialLoadout.character
      : "leo",
    weapons: initialLoadout?.weapons
      ? initialLoadout.weapons.filter(w => allWeaponIds.has(w)).slice(0, 4)
      : [],
    vehicles: initialLoadout?.vehicle && allVehicleIds.has(initialLoadout.vehicle)
      ? initialLoadout.vehicle
      : (allVehicleIds.has(VEHICLE_ITEMS[0]?.id ?? "") ? VEHICLE_ITEMS[0]?.id ?? "" : ""),
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
  extraComboIds: Set<string> = new Set(),
  extraCharIds: Set<string> = new Set(),
  extraVehicleIds: Set<string> = new Set(),
  extraWeaponIds: Set<string> = new Set(),
  hasDbLoadout = false,
) {
  const fallback = getSelectedFromLoadout(initialLoadout, extraComboIds, extraCharIds, extraVehicleIds, extraWeaponIds);
  const allComboIds = extraComboIds.size > 0
    ? new Set([...OWNED_COMBO_IDS, ...extraComboIds])
    : OWNED_COMBO_IDS;
  const allCharIds = extraCharIds.size > 0
    ? new Set([...OWNED_CHARACTER_IDS, ...extraCharIds])
    : OWNED_CHARACTER_IDS;
  const allVehicleIds = extraVehicleIds.size > 0
    ? new Set([...OWNED_VEHICLE_IDS, ...extraVehicleIds])
    : OWNED_VEHICLE_IDS;
  const allWeaponIds = extraWeaponIds.size > 0
    ? new Set([...OWNED_WEAPON_IDS, ...extraWeaponIds])
    : OWNED_WEAPON_IDS;

  // DB loadout (server-side) always beats localStorage — it's the cross-device
  // source of truth. Skip localStorage entirely when the server already provided it.
  if (!persistEnabled || typeof window === "undefined" || hasDbLoadout) {
    return {
      combo: initialLoadout?.combo && allComboIds.has(initialLoadout.combo)
        ? initialLoadout.combo
        : fallback.combo,
      characters: initialLoadout?.character && allCharIds.has(initialLoadout.character)
        ? initialLoadout.character
        : fallback.characters,
      weapons: initialLoadout?.weapons
        ? initialLoadout.weapons.filter(w => allWeaponIds.has(w)).slice(0, 4)
        : fallback.weapons,
      vehicles:  initialLoadout?.vehicle && allVehicleIds.has(initialLoadout.vehicle)
        ? initialLoadout.vehicle
        : fallback.vehicles,
      lobby:     fallback.lobby,
      effects:   fallback.effects,
      name_card: fallback.name_card,
    };
  }

  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return fallback;

    const parsed = JSON.parse(saved) as Partial<LobbyLoadout>;

    return {
      combo: parsed.combo && allComboIds.has(parsed.combo)
        ? parsed.combo
        : fallback.combo,
      characters: parsed.character && allCharIds.has(parsed.character)
        ? parsed.character
        : fallback.characters,
      weapons: parsed.weapons
        ? parsed.weapons.filter(w => allWeaponIds.has(w)).slice(0, 4)
        : fallback.weapons,
      vehicles:  parsed.vehicle && allVehicleIds.has(parsed.vehicle)
        ? parsed.vehicle
        : fallback.vehicles,
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
  hasDbLoadout = false,
  onLoadoutChange,
  onPreviewItem,
  persistEnabled = true,
  storageKey = LOADOUT_STORAGE_KEY,
  gameSlug,
  ownedDbCombos = [],
  ownedDbCharacters = [],
  ownedDbVehicles = [],
  ownedWeapons = [],
  onOpenChange,
}: Props = {}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);
  const [tab, setTab] = useState<LobbyInventoryTab>("characters");
  const [selected, setSelected] = useState<SelectedState>(() => {
    const dbComboIds = new Set(
      ownedDbCombos.map((c) => (c.metadata?.combo_id as string) ?? c.id),
    );
    const dbCharIds = new Set(
      ownedDbCharacters.map((c) => (c.metadata?.character_id as string) ?? c.id),
    );
    const dbVehicleIds = new Set(
      ownedDbVehicles.map((v) => (v.metadata?.vehicle_id as string) ?? v.id),
    );
    const dbWeaponIds = new Set(
      ownedWeapons.map((w) => (w.metadata?.weapon_id as string) ?? w.id),
    );
    return getInitialSelected(initialLoadout, persistEnabled, storageKey, dbComboIds, dbCharIds, dbVehicleIds, dbWeaponIds, hasDbLoadout);
  });
  const [tooltipId, setTooltipId] = useState<string | null>(null);
  const [randomizing, setRandomizing] = useState(false);
  const [saved, setSaved] = useState(false);
  const longPressRef = useRef<number | null>(null);
  const selectedRef = useRef(selected);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const dbComboItems: LobbyInventoryItem[] = ownedDbCombos.map((c) => ({
    id: (c.metadata?.combo_id as string) ?? c.id,
    name: c.name,
    tier: c.tier as LobbyInventoryTier,
    asset: c.image_url ?? undefined,
    thumbnailObjectPosition: "center",
  }));

  const dbCharItems: LobbyInventoryItem[] = ownedDbCharacters.map((c) => ({
    id: (c.metadata?.character_id as string) ?? c.id,
    name: c.name,
    tier: c.tier as LobbyInventoryTier,
    asset: c.image_url ?? undefined,
    thumbnailObjectPosition: (c.metadata?.thumbnail_object_position as string) ?? "53% -1%",
    thumbnailTransformOrigin: (c.metadata?.thumbnail_transform_origin as string) ?? "53% 3%",
  }));

  const dbVehicleItems: LobbyInventoryItem[] = ownedDbVehicles.map((v) => ({
    id: (v.metadata?.vehicle_id as string) ?? v.id,
    name: v.name,
    tier: v.tier as LobbyInventoryTier,
    asset: v.image_url ?? undefined,
    thumbnailObjectPosition: (v.metadata?.thumbnail_object_position as string) ?? "center",
  }));

  const dbWeaponItems: LobbyInventoryItem[] = ownedWeapons.map((w) => {
    const isIcefire =
      (w.metadata?.weapon_id as string) === "m416_icefire" ||
      w.name?.toLowerCase().includes("icefire") ||
      (w.image_url ?? "").toLowerCase().includes("icefire");
    return {
      id: (w.metadata?.weapon_id as string) ?? w.id,
      name: w.name,
      tier: w.tier as LobbyInventoryTier,
      asset: isIcefire ? "/weapons/m416-caucasus-icefire.png" : (w.image_url ?? undefined),
      thumbnailObjectPosition: "center",
    };
  });

  const allComboItems = [
    ...COMBO_ITEMS,
    ...dbComboItems.filter((combo) => !COMBO_ITEMS.some((base) => base.id === combo.id)),
  ];
  const allCharacterItems = [
    ...CHARACTERS,
    ...dbCharItems.filter((c) => !CHARACTERS.some((h) => h.id === c.id)),
  ];
  const allVehicleItems = [
    ...VEHICLE_ITEMS,
    ...dbVehicleItems.filter((v) => !VEHICLE_ITEMS.some((h) => h.id === v.id)),
  ];
  const allWeaponItems = [
    ...WEAPONS_ITEMS,
    ...dbWeaponItems.filter((w) => !WEAPONS_ITEMS.some((h) => h.id === w.id)),
  ];
  const ownedByTab: Record<LobbyInventoryTab, Set<string>> = {
    ...OWNED_BY_TAB,
    combo:      new Set([...OWNED_COMBO_IDS, ...dbComboItems.map((c) => c.id)]),
    characters: new Set([...OWNED_CHARACTER_IDS, ...dbCharItems.map((c) => c.id)]),
    vehicles:   new Set([...OWNED_VEHICLE_IDS, ...dbVehicleItems.map((v) => v.id)]),
    weapons:    new Set([...OWNED_WEAPON_IDS, ...dbWeaponItems.map((w) => w.id)]),
  };

  const getItemsForTab = (tabId: LobbyInventoryTab) => {
    if (tabId === "combo") return allComboItems;
    if (tabId === "characters") return allCharacterItems;
    if (tabId === "vehicles") return allVehicleItems;
    if (tabId === "weapons") return allWeaponItems;
    return TABS.find((t) => t.id === tabId)?.items ?? [];
  };

  const allTabItems = getItemsForTab(tab);

  const activeItems = tab === "characters"
    ? allTabItems
    : allTabItems.filter((item) => ownedByTab[tab].has(item.id));

  const applySelection = (next: SelectedState, changedTab: LobbyInventoryTab, item: LobbyInventoryItem) => {
    if ((changedTab === "characters" || changedTab === "vehicles" || changedTab === "lobby") && next.combo !== "combo_none") {
      next = { ...next, combo: "combo_none" };
    }
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
    let currentSelected = { ...selectedRef.current };
    TABS.forEach((entry, index) => {
      window.setTimeout(() => {
        const ownedSet = ownedByTab[entry.id];
        const availableItems = getItemsForTab(entry.id).filter((item) => ownedSet.has(item.id));
        const item = availableItems[Math.floor(Math.random() * availableItems.length)] ?? availableItems[0];
        if (!item) {
          if (index === TABS.length - 1) {
            window.setTimeout(() => setRandomizing(false), 180);
          }
          return;
        }

        if (entry.id === "weapons") {
          currentSelected = { ...currentSelected, weapons: [item.id] };
        } else {
          currentSelected = { ...currentSelected, [entry.id as keyof SelectedState]: item.id } as SelectedState;
        }
        setSelected(currentSelected);

        const loadout = buildLoadout(currentSelected);
        onLoadoutChange?.(loadout);
        onPreviewItem?.(item, entry.id, loadout);

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
      try {
        const result = await saveLobbyLoadout(gameSlug, loadoutData);
        if (!result.success) {
          console.error("[lobby] save failed", { payload: loadoutData, error: result.error });
        }
      } catch (err) {
        console.error("[lobby] save threw", err);
      }
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
        className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-3 bg-[#0c0919]/70 border border-violet-500/30 px-5 py-2.5 text-[15px] sm:text-[16px] font-black uppercase tracking-[0.2em] text-cyan-300 backdrop-blur-md transition-all duration-300 hover:bg-[#120e24]/90 hover:text-white hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.35)] group rounded-sm"
      >
        {/* Futuristic tech square notch */}
        <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <Package className="h-5 w-5 text-cyan-400 group-hover:text-white transition-colors duration-300" />
        ინვენტარი
      </button>

      {/* Panel — slides up over the bottom-right area */}
      {open && (
        <div
          role="dialog"
          aria-label="ინვენტარი"
          className="absolute inset-0 z-[2000] flex items-stretch justify-end p-2 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          {/* dim the canvas behind */}
          <span aria-hidden className="absolute inset-0 bg-black/50 backdrop-blur-md" />

          <div
            className="relative flex w-full max-w-2xl flex-col bg-[#0b0816]/90 p-4 border border-violet-500/20 backdrop-blur-xl sm:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden"
            style={{
              clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)"
            }}
          >
            {/* Ambient background glows */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-violet-600/10 blur-[100px]" />
            <div className="pointer-events-none absolute -left-20 -bottom-20 h-52 w-52 rounded-full bg-cyan-600/10 blur-[100px]" />
            
            {/* Tech grid overlay */}
            <div className="pointer-events-none absolute inset-0 gr-dot-grid opacity-10" />

            {/* header */}
            <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3 relative z-10">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] animate-pulse" />
                <h2 className="font-display text-[15px] sm:text-[18px] font-extrabold uppercase tracking-[0.18em] text-white">
                  ინვენტარი <span className="text-[10px] font-black text-cyan-400 tracking-normal ml-1">v1.2</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="დახურვა"
                className="grid h-8 w-8 place-items-center rounded-sm border border-white/10 bg-white/5 text-[var(--gr-text-mute)] transition-all duration-300 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* tabs */}
            <div className="mb-4 flex gap-1 border-b border-white/5 pb-2 relative z-10 overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide">
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`relative flex shrink-0 min-w-[80px] items-center justify-center gap-1.5 rounded-sm py-2 px-3 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.08em] transition-all duration-300 ${
                      active
                        ? "bg-cyan-500/10 text-cyan-300 border-b-2 border-cyan-400 shadow-[inset_0_1px_8px_rgba(34,211,238,0.1)]"
                        : "text-[var(--gr-text-mute)] hover:bg-white/[0.03] hover:text-white border-b-2 border-transparent"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-cyan-400" : "text-white/40"}`} />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* empty state */}
            {activeItems.length === 0 && (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 py-10 text-center relative z-10">
                <Package className="h-12 w-12 text-[var(--gr-text-mute)] opacity-20" />
                <p className="text-[13px] sm:text-[15px] font-semibold uppercase tracking-[0.14em] text-[var(--gr-text-mute)]">
                  ჯერ არ გაქვს ამ კატეგორიის აიტემი
                </p>
                <p className="text-[12px] sm:text-[13px] text-[var(--gr-text-dim)]">
                  შეიძინე <span className="font-bold text-[var(--gr-violet-hi)]">შოპიდან</span>
                </p>
              </div>
            )}

            {/* grid */}
            {activeItems.length > 0 && (
              <div className="flex-1 overflow-y-auto pr-1 relative z-10">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {activeItems.map((item) => {
                    const isOverriddenByCombo = (tab === "characters" || tab === "vehicles" || tab === "lobby") && selected.combo !== "combo_none";
                    const isSelected = !isOverriddenByCombo && (tab === "weapons" ? selected.weapons.includes(item.id) : (selected as SelectedState)[tab] === item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (tab === "weapons") {
                            const newWeapons = selected.weapons.includes(item.id)
                              ? selected.weapons.filter((w) => w !== item.id)
                              : [...selected.weapons, item.id].slice(-4);
                            applySelection({ ...selected, weapons: newWeapons }, tab, item);
                          } else {
                            applySelection({ ...selected, [tab]: item.id } as SelectedState, tab, item);
                          }
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
                        className={`group relative ${tab === "characters" ? "aspect-[3/4]" : "aspect-square"} overflow-visible transition-all duration-300 hover:scale-[1.03] rounded-sm border ${
                          isSelected
                            ? `border-cyan-400 bg-[#120e24] shadow-[0_0_15px_rgba(34,211,238,0.25)]`
                            : `border-white/5 bg-[#0f0c1e] hover:border-white/20 ${TIER_GLOW[item.tier]}`
                        }`}
                        title={`${item.name} · ${TIER_LABEL[item.tier]}`}
                        style={{
                          clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)"
                        }}
                      >
                        {/* Selected target notches */}
                        {isSelected && (
                          <>
                            <span className="absolute -top-[1px] -left-[1px] w-2 h-2 border-t-2 border-l-2 border-cyan-400 z-30" />
                            <span className="absolute -top-[1px] -right-[1px] w-2 h-2 border-t-2 border-r-2 border-cyan-400 z-30" />
                            <span className="absolute -bottom-[1px] -left-[1px] w-2 h-2 border-b-2 border-l-2 border-cyan-400 z-30" />
                            <span className="absolute -bottom-[1px] -right-[1px] w-2 h-2 border-b-2 border-r-2 border-cyan-400 z-30" />
                          </>
                        )}

                        {/* tier gradient background */}
                        <span
                          aria-hidden="true"
                          className={`absolute inset-0 bg-gradient-to-br ${TIER_GRADIENT[item.tier]} opacity-[0.12]`}
                        />
                        {item.id === "fx_none" || item.id === "combo_none" ? (
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
                              className={`h-full w-full ${tab === "weapons" || tab === "vehicles" ? "object-contain p-2" : "object-cover"}`}
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
                          <span className="absolute inset-0 z-10 grid place-items-center font-display text-[20px] font-black uppercase text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                            {item.name.slice(0, 1)}
                          </span>
                        )}
                        {isSelected && (
                          <span className="absolute right-1 top-1 z-20 grid h-4.5 w-4.5 place-items-center bg-cyan-500 text-slate-950 font-black shadow-[0_0_8px_rgba(34,211,238,0.7)] rounded-full">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </span>
                        )}
                        {tooltipId === item.id ? <LobbyItemTooltip item={item} tab={tab} /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* selected item details */}
            {(() => {
              const activeId = (tab === "characters" || tab === "vehicles" || tab === "lobby") && selected.combo !== "combo_none"
                ? null
                : selected[tab];
              const item = activeItems.find((i) => i.id === activeId);
              if (!item) return null;
              return (
                <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/5 bg-white/[0.02] p-3 rounded-sm border-l-2 border-cyan-400 relative z-10">
                  <div className="min-w-0">
                    <div className="truncate font-display text-[14px] sm:text-[16px] font-black uppercase tracking-[0.1% ] text-white">
                      {item.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`inline-block rounded-[2px] px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-[0.08em] ${TIER_LABEL_BG[item.tier]}`}>
                        {TIER_LABEL[item.tier]}
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--gr-text-dim)]">
                        ID: {item.id}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-400/30 px-3 py-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300"
                    style={{ clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)" }}
                  >
                    <Check className="h-3.5 w-3.5 text-cyan-400 stroke-[3]" />
                    არჩეული
                  </span>
                </div>
              );
            })()}

            {/* action buttons */}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/5 pt-4 relative z-10">
              <button
                type="button"
                onClick={randomizeLoadout}
                disabled={randomizing}
                className="inline-flex h-11 items-center justify-center gap-2 bg-cyan-500/10 border border-cyan-400/30 px-4 text-[11px] sm:text-[12px] font-black uppercase tracking-[0.15em] text-cyan-300 transition-all duration-300 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-white hover:shadow-[0_0_15px_rgba(34,211,238,0.25)] disabled:opacity-50"
                style={{ clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)" }}
              >
                <Dices className="h-4 w-4 text-cyan-400" />
                Randomize
              </button>
              <button
                type="button"
                onClick={savePreset}
                disabled={!persistEnabled}
                className={`inline-flex h-11 items-center justify-center gap-2 px-4 text-[11px] sm:text-[12px] font-black uppercase tracking-[0.15em] border transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-45 ${
                  saved
                    ? "bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400 hover:text-white hover:shadow-[0_0_15px_rgba(245,165,36,0.25)]"
                }`}
                style={{ clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)" }}
              >
                {saved ? (
                  <>
                    <CheckCheck className="h-4 w-4 text-emerald-400 stroke-[3]" />
                    შენახულია
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 text-amber-400" />
                    Save Preset
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
