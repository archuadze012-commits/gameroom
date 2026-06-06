"use client";

import { useState } from "react";
import type { ShopItem, ShopCategory } from "@/types/shop";
import { GLOBAL_SHOP_CATEGORIES, GAME_SHOP_CATEGORIES } from "@/types/shop";
import { ShopItemCard } from "@/components/shop/shop-item-card";
import { ShopCrates } from "@/components/shop/shop-crates";
import type { EventBox } from "@/types/events";

type Props = {
  items: ShopItem[];
  hasSession: boolean;
  variant?: "global" | "game";
  premiumBoxes?: EventBox[];
};

type GameShopTab = ShopCategory | "premium_shop";

export function ShopGrid({ items, hasSession, variant = "global", premiumBoxes = [] }: Props) {
  const categories: Array<{ key: GameShopTab; label: string; emoji: string }> = variant === "game"
    ? [
        ...(premiumBoxes.length ? [{ key: "premium_shop" as const, label: "პრემიუმ შოპი", emoji: "🎁" }] : []),
        ...GAME_SHOP_CATEGORIES,
      ]
    : GLOBAL_SHOP_CATEGORIES;

  const initialCategory: GameShopTab =
    variant === "game" && premiumBoxes.length
      ? "premium_shop"
      : (categories[0]?.key ?? "profile_frame");

  const [activeCategory, setActiveCategory] = useState<GameShopTab>(initialCategory);

  const filtered = activeCategory === "premium_shop"
    ? []
    : items.filter((i) => i.category === activeCategory);
  const activeMeta = categories.find((c) => c.key === activeCategory);
  const activeCount = activeCategory === "premium_shop" ? premiumBoxes.length : filtered.length;
  const activeDescription = activeCategory === "premium_shop"
    ? "აქ ჩანს მხოლოდ ორი სპეციალური crate."
    : activeCategory === "combo"
      ? "აქ ერთ item-ში უკვე გაერთიანებულია ჩარაქტერი და სრულად დადგმული lobby scene."
    : "Clean marketplace layout with a stronger product stage and compact controls.";

  return (
    <section>
      {/* Category tabs */}
      <div className="mb-8 flex flex-wrap gap-2.5">
        {categories.map((cat) => {
          const count = cat.key === "premium_shop"
            ? premiumBoxes.length
            : items.filter((i) => i.category === cat.key).length;
          const isActive = cat.key === activeCategory;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`relative flex h-10 items-center gap-2 rounded-full px-4 text-[11px] font-black uppercase tracking-[0.16em] transition-all duration-300 ${
                isActive
                  ? "border border-pink-500/40 bg-[linear-gradient(90deg,rgba(236,72,153,0.15),rgba(139,92,246,0.15))] text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] scale-[1.02]"
                  : "border border-white/5 bg-white/5 text-white/50 hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-white"
              }`}
            >
              <span className="drop-shadow-md">{cat.emoji}</span>
              <span>{cat.label}</span>
              <span className={`ml-1 rounded-full px-2 py-0.5 tabular-nums text-[9px] border ${isActive ? "border-pink-500/30 bg-pink-500/20 text-pink-300" : "border-white/10 bg-black/40 text-white/40"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Section heading */}
      {activeMeta && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl font-black uppercase text-white drop-shadow-md">
              <span className="mr-3">{activeMeta.emoji}</span>
              {activeMeta.label}
              <span className="ml-3 text-[20px] text-white/30">({activeCount})</span>
            </h2>
          </div>
        </div>
      )}

      {/* Items grid */}
      {activeCategory === "premium_shop" ? (
        <ShopCrates boxes={premiumBoxes} hasSession={hasSession} embedded />
      ) : filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <ShopItemCard key={item.id} item={item} hasSession={hasSession} />
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 py-16 text-center text-[14px] font-bold text-white/40">
          ამ კატეგორიაში ჯერ ნივთები არ არის.
        </div>
      )}
    </section>
  );
}
