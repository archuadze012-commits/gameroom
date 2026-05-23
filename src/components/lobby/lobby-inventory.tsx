"use client";

import { useState } from "react";
import { Package, X, Check, User, Crosshair, Shirt } from "lucide-react";

type Tier = "common" | "rare" | "epic" | "legendary";

type Item = {
  id: string;
  name: string;
  tier: Tier;
  /** Optional asset URL (PNG with transparent bg). When wired, applies to the lobby canvas. */
  asset?: string;
};

const CHARACTERS: Item[] = [
  { id: "soldier",  name: "ჯარისკაცი", tier: "common" },
  { id: "assassin", name: "მკვლელი",   tier: "rare" },
  { id: "sniper",   name: "სნაიპერი",  tier: "epic" },
  { id: "ghost",    name: "ღრუბელი",   tier: "legendary" },
];

const WEAPONS: Item[] = [
  { id: "akm",   name: "AKM",    tier: "common" },
  { id: "m416",  name: "M416",   tier: "rare" },
  { id: "scarl", name: "SCAR-L", tier: "epic" },
  { id: "awm",   name: "AWM",    tier: "legendary" },
];

const CLOTHING: Item[] = [
  { id: "camo",     name: "კამუფლაჟი",     tier: "common" },
  { id: "tactical", name: "ტაქტიკური",     tier: "rare" },
  { id: "stealth",  name: "ჩუმი",          tier: "epic" },
  { id: "festive",  name: "სადღესასწაულო",  tier: "legendary" },
];

const TIER_RING: Record<Tier, string> = {
  common:    "ring-[var(--gr-text-mute)]",
  rare:      "ring-[var(--gr-cyan-glow)]",
  epic:      "ring-[var(--gr-violet-hi)]",
  legendary: "ring-[var(--gr-amber)]",
};

const TIER_GRADIENT: Record<Tier, string> = {
  common:    "from-slate-700 to-slate-900",
  rare:      "from-cyan-700 to-cyan-950",
  epic:      "from-violet-700 to-violet-950",
  legendary: "from-amber-600 to-orange-900",
};

const TIER_LABEL: Record<Tier, string> = {
  common:    "ჩვეულებრივი",
  rare:      "იშვიათი",
  epic:      "ეპიკური",
  legendary: "ლეგენდარული",
};

type Tab = "characters" | "weapons" | "clothing";

export type LobbyLoadout = {
  character: string;
  weapon: string;
  clothing: string;
};

const TABS: { id: Tab; label: string; icon: typeof User; items: Item[] }[] = [
  { id: "characters", label: "გმირები",    icon: User,      items: CHARACTERS },
  { id: "weapons",    label: "იარაღი",    icon: Crosshair, items: WEAPONS },
  { id: "clothing",   label: "ტანსაცმელი", icon: Shirt,     items: CLOTHING },
];

const cutSm = "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)";

type Props = {
  initialLoadout?: LobbyLoadout;
  onLoadoutChange?: (loadout: LobbyLoadout) => void;
};

export function LobbyInventory({ initialLoadout, onLoadoutChange }: Props = {}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("characters");
  const [selected, setSelected] = useState<Record<Tab, string>>({
    characters: initialLoadout?.character ?? "soldier",
    weapons:    initialLoadout?.weapon ?? "m416",
    clothing:   initialLoadout?.clothing ?? "tactical",
  });

  const activeItems = TABS.find((t) => t.id === tab)?.items ?? [];

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
          <span aria-hidden className="absolute inset-0 bg-black/45 backdrop-blur-sm" />

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
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const next = { ...selected, [tab]: item.id };
                      setSelected(next);
                      onLoadoutChange?.({
                        character: next.characters,
                        weapon: next.weapons,
                        clothing: next.clothing,
                      });
                    }}
                    className={`group relative aspect-square overflow-hidden bg-gradient-to-br ${TIER_GRADIENT[item.tier]} ring-1 ${isSelected ? `ring-2 ${TIER_RING[item.tier]} shadow-[0_0_16px_rgba(139,92,246,0.5)]` : "ring-[var(--gr-border)] hover:ring-[var(--gr-border-hi)]"} transition-all hover:scale-[1.04]`}
                    style={{ clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)" }}
                    title={`${item.name} · ${TIER_LABEL[item.tier]}`}
                  >
                    {/* placeholder — first letter + tier glow */}
                    <span className="absolute inset-0 grid place-items-center font-display text-[20px] font-extrabold uppercase text-white/85"
                      style={{ textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}
                    >
                      {item.name.slice(0, 1)}
                    </span>
                    {isSelected && (
                      <span className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center bg-[var(--gr-violet)] text-white shadow-[0_0_8px_rgba(139,92,246,0.7)]">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
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
          </div>
        </div>
      )}
    </>
  );
}
