"use client";

import { useState, useTransition } from "react";
import { Check, Lock, ShoppingCart, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ShopItem, ShopTier } from "@/types/shop";
import { purchaseShopItem } from "@/lib/shop/actions";
import { equipItem, unequipCategory } from "@/lib/shop/equip-actions";

const TIER_BG: Record<ShopTier, string> = {
  common:    "from-slate-800/60 to-slate-900/80",
  rare:      "from-blue-900/50 to-blue-950/80",
  epic:      "from-violet-900/50 to-fuchsia-950/80",
  legendary: "from-amber-900/30 to-orange-950/60",
};
const TIER_RING: Record<ShopTier, string> = {
  common:    "ring-slate-600/40",
  rare:      "ring-blue-500/40",
  epic:      "ring-violet-500/50",
  legendary: "ring-amber-400/60",
};
const TIER_BADGE: Record<ShopTier, string> = {
  common:    "bg-slate-600/40 text-slate-300",
  rare:      "bg-blue-600/30 text-blue-300",
  epic:      "bg-violet-600/30 text-violet-300",
  legendary: "bg-amber-500/25 text-amber-300",
};
const TIER_LABEL: Record<ShopTier, string> = {
  common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary",
};
const CURRENCY_COLOR: Record<string, string> = {
  nc:  "text-[#C8D4DC]",
  pro: "text-[var(--gr-amber)]",
};
const CURRENCY_LABEL: Record<string, string> = { nc: "NC", pro: "Pro" };

function ItemPreview({ item }: { item: ShopItem }) {
  const meta = item.metadata;

  if (item.category === "badge" && meta.emoji) {
    return <span className="text-4xl">{meta.emoji as string}</span>;
  }

  if (item.category === "profile_frame" && meta.color) {
    return (
      <div
        className="h-16 w-16 rounded-full ring-[3px] tier-glow-pulse"
        style={{
          boxShadow: `0 0 24px ${meta.color as string}60, inset 0 0 12px ${meta.color as string}30`,
          borderColor: meta.color as string,
          border: `3px solid ${meta.color as string}`,
        }}
      />
    );
  }

  if (item.category === "name_frame" && meta.gradient) {
    return (
      <span className={`bg-gradient-to-r ${meta.gradient as string} bg-clip-text font-display text-xl font-extrabold uppercase text-transparent`}>
        Player
      </span>
    );
  }

  if (item.category === "chat_flair") {
    if (meta.gradient) {
      return (
        <span className={`bg-gradient-to-r ${meta.gradient as string} bg-clip-text font-bold text-transparent`}>
          Username
        </span>
      );
    }
    return <span className="font-bold" style={{ color: meta.color as string }}>Username</span>;
  }

  if (item.category === "lobby_effect") {
    return (
      <div
        className="h-12 w-12 rounded-full tier-glow-pulse"
        style={{ background: `radial-gradient(circle, ${meta.color as string}60 0%, transparent 70%)` }}
      />
    );
  }

  if (item.category === "name_card" && meta.emoji) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-3xl">{meta.emoji as string}</span>
        <div className="flex h-10 w-20 items-center justify-center bg-gradient-to-br from-blue-900/50 to-blue-950/80 ring-1 ring-blue-500/30"
          style={{ clipPath: "polygon(0 0,calc(100%-6px) 0,100% 6px,100% 100%,0 100%)" }}>
          <span className="text-[8px] font-black uppercase tracking-[0.12em] text-blue-300/80">Name Card</span>
        </div>
      </div>
    );
  }

  if (item.category === "cover" && meta.gradient) {
    return (
      <div className={`h-12 w-full rounded-sm bg-gradient-to-r ${meta.gradient as string} ring-1 ring-white/10`} />
    );
  }

  if (item.category === "profile_theme" && meta.bg) {
    return (
      <div className={`h-16 w-24 rounded-sm bg-gradient-to-br ${meta.bg as string} ring-1 ring-white/10`} />
    );
  }

  if (item.category === "character") {
    return (
      <div className="flex h-16 w-16 items-center justify-center bg-gradient-to-br from-white/5 to-white/[0.02] ring-1 ring-white/10"
        style={{ clipPath: "polygon(0 0,calc(100%-8px) 0,100% 8px,100% 100%,0 100%)" }}>
        <span className="text-2xl">🎭</span>
      </div>
    );
  }

  return <ShoppingCart className="h-10 w-10 text-[var(--gr-text-dim)]" />;
}

export function ShopItemCard({ item, hasSession }: { item: ShopItem; hasSession: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function handleEquip() {
    if (isPending) return;
    startTransition(async () => {
      if (item.equipped) {
        const result = await unequipCategory(item.category);
        if (result.success) {
          setFeedback({ type: "success", msg: "მოხსნილია" });
          router.refresh();
        }
      } else {
        const result = await equipItem(item.id);
        if (result.success) {
          setFeedback({ type: "success", msg: "გამოყენებულია!" });
          router.refresh();
        } else {
          setFeedback({ type: "error", msg: result.error === "not_owned" ? "ჯერ შეიძინე" : "შეცდომა" });
        }
      }
      setTimeout(() => setFeedback(null), 2500);
    });
  }

  function handlePurchase() {
    if (!hasSession) { router.push("/auth/login"); return; }
    if (item.owned || isPending) return;
    startTransition(async () => {
      const result = await purchaseShopItem(item.id);
      if (result.success) {
        setFeedback({ type: "success", msg: `${result.item_name} შეძენილია!` });
        router.refresh();
      } else {
        const msgs: Record<string, string> = {
          insufficient_funds: "არასაკმარისი ბალანსი",
          already_owned:      "უკვე გაქვს",
          not_authenticated:  "გაიარე ავტორიზაცია",
          item_not_found:     "ნივთი ვერ მოიძებნა",
          unknown:            "შეცდომა",
        };
        setFeedback({ type: "error", msg: msgs[result.error] ?? "შეცდომა" });
      }
      setTimeout(() => setFeedback(null), 3000);
    });
  }

  return (
    <div
      className={`group relative flex flex-col bg-gradient-to-br ${TIER_BG[item.tier]} ring-1 ${TIER_RING[item.tier]} transition hover:ring-2 hover:brightness-110`}
      style={{ clipPath: "polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%)" }}
    >
      {/* tier badge */}
      <span className={`absolute left-0 top-0 z-10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] ${TIER_BADGE[item.tier]}`}>
        {TIER_LABEL[item.tier]}
      </span>

      {/* status badge */}
      {item.equipped ? (
        <span className="absolute right-3 top-1 z-10 flex items-center gap-1 text-[9px] font-bold text-[var(--gr-violet-hi)]">
          <Sparkles className="h-3 w-3" /> აქტიური
        </span>
      ) : item.owned ? (
        <span className="absolute right-3 top-1 z-10 flex items-center gap-1 text-[9px] font-bold text-emerald-400">
          <Check className="h-3 w-3" /> შეძენილი
        </span>
      ) : null}

      {/* preview area */}
      <div className="flex h-28 items-center justify-center px-3 pt-4">
        <ItemPreview item={item} />
      </div>

      {/* info */}
      <div className="flex flex-1 flex-col gap-2 p-3 pt-1">
        <div>
          <p className="font-display text-[13px] font-extrabold uppercase leading-tight tracking-tight text-white">
            {item.name}
          </p>
          {item.description && (
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[var(--gr-text-dim)]">
              {item.description}
            </p>
          )}
        </div>

        {/* price + buy */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className={`text-[13px] font-black tabular-nums ${CURRENCY_COLOR[item.cost_currency]}`}>
            {item.cost_amount} {CURRENCY_LABEL[item.cost_currency]}
          </span>

          {item.owned ? (
            <button
              type="button"
              onClick={handleEquip}
              disabled={isPending}
              className={`flex h-7 items-center gap-1 px-2.5 text-[9px] font-black uppercase tracking-[0.1em] ring-1 transition [clip-path:polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,0_100%)] ${
                item.equipped
                  ? "bg-[color-mix(in_srgb,var(--gr-violet)_20%,transparent)] text-[var(--gr-violet-hi)] ring-[var(--gr-violet-hi)]/50"
                  : "bg-[var(--gr-bg-2)] text-[var(--gr-text-dim)] ring-[var(--gr-border)] hover:text-[var(--gr-text)] hover:ring-[var(--gr-border-hi)]"
              }`}
            >
              {item.equipped ? <><Sparkles className="h-3 w-3" /> აქტიური</> : "გამოყენება"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePurchase}
              disabled={isPending}
              className="h-7 px-3 text-[10px] font-black uppercase tracking-[0.12em] text-black transition hover:brightness-110 active:scale-95 disabled:opacity-50 [clip-path:polygon(0_0,calc(100%-7px)_0,100%_7px,100%_100%,0_100%)]"
              style={{ background: "linear-gradient(180deg,#f5c842 0%,#e6a800 55%,#c87f00 100%)" }}
            >
              {isPending ? "..." : "ყიდვა"}
            </button>
          )}
        </div>

        {feedback && (
          <p className={`text-[10px] font-bold ${feedback.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
            {feedback.msg}
          </p>
        )}
      </div>
    </div>
  );
}
