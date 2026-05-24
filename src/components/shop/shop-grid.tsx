"use client";

import { useState } from "react";
import type { ShopItem, ShopCategory } from "@/types/shop";
import { GLOBAL_SHOP_CATEGORIES, GAME_SHOP_CATEGORIES } from "@/types/shop";
import { ShopItemCard } from "@/components/shop/shop-item-card";

type Props = {
  items: ShopItem[];
  hasSession: boolean;
  variant?: "global" | "game";
};

export function ShopGrid({ items, hasSession, variant = "global" }: Props) {
  const categories = variant === "game" ? GAME_SHOP_CATEGORIES : GLOBAL_SHOP_CATEGORIES;
  const [activeCategory, setActiveCategory] = useState<ShopCategory>(categories[0]?.key ?? "profile_frame");

  const filtered = items.filter((i) => i.category === activeCategory);
  const activeMeta = categories.find((c) => c.key === activeCategory);

  return (
    <div>
      {/* Category tabs */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {categories.map((cat) => {
          const count = items.filter((i) => i.category === cat.key).length;
          const isActive = cat.key === activeCategory;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`flex h-8 items-center gap-1.5 px-3 text-[10px] font-black uppercase tracking-[0.12em] ring-1 transition [clip-path:polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,0_100%)] ${
                isActive
                  ? "bg-[color-mix(in_srgb,var(--gr-amber)_16%,transparent)] text-[var(--gr-amber)] ring-[color-mix(in_srgb,var(--gr-amber)_50%,transparent)]"
                  : "bg-[var(--gr-bg-2)] text-[var(--gr-text-dim)] ring-[var(--gr-border)] hover:text-[var(--gr-text)] hover:ring-[var(--gr-border-hi)]"
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
              <span className={`ml-0.5 tabular-nums ${isActive ? "text-[var(--gr-amber)]/60" : "text-[var(--gr-text-dim)]/50"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Section heading */}
      {activeMeta && (
        <h2 className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--gr-text-dim)]">
          <span>{activeMeta.emoji}</span>
          {activeMeta.label}
          <span className="text-[var(--gr-text-dim)]/50">({filtered.length})</span>
        </h2>
      )}

      {/* Items grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((item) => (
            <ShopItemCard key={item.id} item={item} hasSession={hasSession} />
          ))}
        </div>
      ) : (
        <p className="border border-dashed border-[var(--gr-border-hi)] bg-[var(--gr-bg-2)]/40 py-12 text-center text-[13px] text-[var(--gr-text-mute)]">
          ამ კატეგორიაში ჯერ ნივთები არ არის.
        </p>
      )}
    </div>
  );
}
