"use client";

import type { LobbyInventoryItem, LobbyInventoryTab } from "@/components/lobby/lobby-inventory";

type LobbyItemTooltipProps = {
  item: LobbyInventoryItem;
  tab: LobbyInventoryTab;
};

const statLabels: Record<LobbyInventoryTab, string[]> = {
  characters: ["Health", "Speed", "Stamina"],
  weapons: ["Damage", "Range", "Recoil", "Rate"],
  clothing: ["Style", "Camo", "Rarity"],
};

const tierColor: Record<LobbyInventoryItem["tier"], string> = {
  common: "var(--gr-text-mute)",
  rare: "var(--gr-cyan-glow)",
  epic: "var(--gr-violet-hi)",
  legendary: "var(--gr-amber)",
};

function statValue(id: string, index: number) {
  let hash = 0;
  for (let position = 0; position < id.length; position += 1) {
    hash = Math.imul(hash ^ id.charCodeAt(position), 31) >>> 0;
  }

  return 34 + ((hash + index * 23) % 61);
}

export function LobbyItemTooltip({ item, tab }: LobbyItemTooltipProps) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-50 w-44 -translate-x-1/2 bg-[color-mix(in_srgb,var(--gr-bg-0)_90%,transparent)] p-2.5 text-left shadow-[var(--gr-card-shadow)] ring-1 ring-[color-mix(in_srgb,var(--gr-text)_20%,transparent)] backdrop-blur-md [clip-path:polygon(0_0,calc(100%_-_10px)_0,100%_10px,100%_100%,0_100%)]">
      <div className="truncate font-display text-[12px] font-bold uppercase tracking-normal text-white">
        {item.name}
      </div>
      <div
        className="mt-0.5 text-[8px] font-black uppercase tracking-[0.16em]"
        style={{ color: tierColor[item.tier] }}
      >
        {item.tier}
      </div>

      <div className="mt-2 space-y-1.5">
        {statLabels[tab].map((label, index) => {
          const value = statValue(item.id, index);

          return (
            <div key={label} className="grid grid-cols-[48px_1fr] items-center gap-2">
              <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--gr-text-dim)]">
                {label}
              </span>
              <span className="h-1 overflow-hidden bg-[color-mix(in_srgb,var(--gr-text)_10%,transparent)]">
                <span
                  className="block h-full bg-[linear-gradient(90deg,var(--gr-violet),var(--gr-amber))]"
                  style={{ width: `${value}%` }}
                />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
