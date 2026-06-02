"use client";

import { useState, useTransition } from "react";
import { Check, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ShopItem, ShopTier } from "@/types/shop";
import { purchaseShopItem } from "@/lib/shop/actions";
import { equipItem, unequipCategory } from "@/lib/shop/equip-actions";
import { LobbyFireEffect } from "@/components/lobby/lobby-fire-effect";

/* ─── Tier colours ──────────────────────────────────────── */
const TIER_BORDER_DEFAULT: Record<ShopTier, string> = {
  common:    "rgba(148,163,184,0.45)",
  rare:      "rgba(96,165,250,0.50)",
  epic:      "rgba(167,139,250,0.55)",
  legendary: "rgba(251,191,36,0.60)",
};
const TIER_TOP_GRAD: Record<ShopTier, string> = {
  common:    "linear-gradient(90deg,transparent,rgba(148,163,184,0.7),transparent)",
  rare:      "linear-gradient(90deg,transparent,rgba(96,165,250,0.8),transparent)",
  epic:      "linear-gradient(90deg,transparent,rgba(167,139,250,0.9),transparent)",
  legendary: "linear-gradient(90deg,transparent,rgba(251,191,36,0.95),transparent)",
};
const TIER_INNER_BG: Record<ShopTier, string> = {
  common:    "linear-gradient(155deg,#1e293b 0%,#0f172a 100%)",
  rare:      "linear-gradient(155deg,#1e3a8a 0%,#172554 100%)",
  epic:      "linear-gradient(155deg,#3b0764 0%,#1e1b4b 100%)",
  legendary: "linear-gradient(155deg,#78350f 0%,#1c1003 100%)",
};
const TIER_GLOW_COLOR: Record<ShopTier, string> = {
  common:    "rgba(148,163,184,0.12)",
  rare:      "rgba(96,165,250,0.12)",
  epic:      "rgba(167,139,250,0.14)",
  legendary: "rgba(251,191,36,0.14)",
};
const TIER_BADGE_STYLE: Record<ShopTier, { bg: string; color: string }> = {
  common:    { bg: "rgba(100,116,139,0.4)",  color: "#cbd5e1" },
  rare:      { bg: "rgba(59,130,246,0.28)",  color: "#93c5fd" },
  epic:      { bg: "rgba(139,92,246,0.30)",  color: "#c4b5fd" },
  legendary: { bg: "rgba(245,158,11,0.30)",  color: "#fcd34d" },
};
const TIER_LABEL: Record<ShopTier, string> = {
  common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary",
};
const CURRENCY_COLOR: Record<string, string> = {
  nc: "#C8D4DC",
  pro: "var(--gr-amber)",
};
const CURRENCY_LABEL: Record<string, string> = { nc: "NC", pro: "Pro" };

const CUT = "polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%)";
const CUT_SM = "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%)";

/* magenta hover values — same trick as post cards */
const MAGENTA_BORDER = "rgba(236,72,153,0.85)";
const MAGENTA_LASER  = "linear-gradient(90deg,transparent,rgba(236,72,153,0.9),transparent)";

/* ─── Item preview ─────────────────────────────────────── */
function ItemPreview({ item }: { item: ShopItem }) {
  const meta = item.metadata;

  if (item.category === "badge" && meta.emoji)
    return <span className="text-4xl drop-shadow-[0_0_14px_rgba(255,255,255,0.45)]">{meta.emoji as string}</span>;

  if (item.category === "profile_frame" && meta.color)
    return (
      <div
        className="h-16 w-16 rounded-full"
        style={{
          border: `3px solid ${meta.color as string}`,
          boxShadow: `0 0 22px ${meta.color as string}80, inset 0 0 10px ${meta.color as string}30`,
        }}
      />
    );

  if (item.category === "name_frame" && meta.gradient)
    return (
      <span className={`bg-gradient-to-r ${meta.gradient as string} bg-clip-text font-display text-xl font-extrabold uppercase text-transparent`}>
        Player
      </span>
    );

  if (item.category === "chat_flair") {
    if (meta.gradient)
      return <span className={`bg-gradient-to-r ${meta.gradient as string} bg-clip-text font-bold text-transparent`}>Username</span>;
    return <span className="font-bold" style={{ color: meta.color as string }}>Username</span>;
  }

  if (item.category === "lobby_effect") {
    if (meta.effect === "fire_lobby")
      return (
        <div className="relative w-full overflow-hidden" style={{ height: 112 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lobbies/pubg-mobile-optimized.jpg" alt="" draggable={false}
            loading="lazy" decoding="async"
            className="absolute inset-0 h-full w-full object-cover" />
          <span style={{ position: "absolute", width: 600, height: 300, bottom: 0, left: "50%",
            transform: "translateX(-50%) scale(0.30)", transformOrigin: "bottom center" }}>
            <LobbyFireEffect />
          </span>
        </div>
      );
    return (
      <div className="h-12 w-12 rounded-full"
        style={{ background: `radial-gradient(circle, ${meta.color as string}60 0%, transparent 70%)` }} />
    );
  }

  if (item.category === "name_card" && meta.emoji)
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-3xl">{meta.emoji as string}</span>
        <div className="flex h-10 w-20 items-center justify-center"
          style={{ background: "linear-gradient(135deg,#1e3a8a,#172554)", clipPath: CUT_SM }}>
          <span className="text-[8px] font-black uppercase tracking-[0.12em] text-blue-300/80">Name Card</span>
        </div>
      </div>
    );

  if (item.category === "cover" && meta.gradient)
    return <div className={`h-12 w-full rounded-sm bg-gradient-to-r ${meta.gradient as string} ring-1 ring-white/10`} />;

  if (item.category === "profile_theme" && meta.bg)
    return <div className={`h-16 w-24 rounded-sm bg-gradient-to-br ${meta.bg as string} ring-1 ring-white/10`} />;

  if (item.category === "character") {
    if (item.image_url)
      return (
        <div className="relative w-full overflow-hidden" style={{ height: 160 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image_url} alt={item.name} draggable={false}
            loading="lazy" decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-top" />
        </div>
      );
    return (
      <div className="flex h-16 w-16 items-center justify-center"
        style={{ background: "rgba(255,255,255,0.04)", clipPath: CUT }}>
        <span className="text-2xl">🎭</span>
      </div>
    );
  }

  return <span className="text-4xl opacity-30">🛒</span>;
}

/* ─── Card ─────────────────────────────────────────────── */
export function ShopItemCard({ item, hasSession }: { item: ShopItem; hasSession: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const borderDefault = TIER_BORDER_DEFAULT[item.tier];
  const topGrad       = TIER_TOP_GRAD[item.tier];
  const innerBg       = TIER_INNER_BG[item.tier];
  const glowColor     = TIER_GLOW_COLOR[item.tier];
  const badge         = TIER_BADGE_STYLE[item.tier];
  const isHero        = item.category === "character" && !!item.image_url;

  function handleEquip() {
    if (isPending) return;
    startTransition(async () => {
      if (item.equipped) {
        const r = await unequipCategory(item.category);
        if (r.success) { setFeedback({ type: "success", msg: "მოხსნილია" }); router.refresh(); }
      } else {
        const r = await equipItem(item.id);
        if (r.success) { setFeedback({ type: "success", msg: "გამოყენებულია!" }); router.refresh(); }
        else { setFeedback({ type: "error", msg: r.error === "not_owned" ? "ჯერ შეიძინე" : "შეცდომა" }); }
      }
      setTimeout(() => setFeedback(null), 2500);
    });
  }

  function handlePurchase() {
    if (!hasSession) { router.push("/auth/login"); return; }
    if (item.owned || isPending) return;
    startTransition(async () => {
      const r = await purchaseShopItem(item.id);
      if (r.success) {
        setFeedback({ type: "success", msg: `${r.item_name} შეძენილია!` });
        router.refresh();
      } else {
        const msgs: Record<string, string> = {
          insufficient_funds: "არასაკმარისი ბალანსი",
          already_owned: "უკვე გაქვს",
          not_authenticated: "გაიარე ავტორიზაცია",
          item_not_found: "ნივთი ვერ მოიძებნა",
          unknown: "შეცდომა",
        };
        setFeedback({ type: "error", msg: msgs[r.error] ?? "შეცდომა" });
      }
      setTimeout(() => setFeedback(null), 3000);
    });
  }

  return (
    /* ── outer border wrapper — same trick as post cards ──
       CSS var flips to magenta on group-hover              */
    <div
      className="group relative isolate transition-all duration-300
                 group-hover:[--shop-border:rgba(236,72,153,0.85)]"
      style={{
        clipPath: CUT,
        background: `var(--shop-border, ${borderDefault})`,
        padding: 1,
      }}
    >
      {/* ── inner card ── */}
      <div
        className="relative flex h-full flex-col overflow-hidden"
        style={{ clipPath: CUT, background: innerBg }}
      >
        {/* permanent tier top-line */}
        <span
          aria-hidden
          className="absolute left-0 top-0 z-10 h-[2px] w-full"
          style={{ background: topGrad }}
        />

        {/* laser sweeper on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-10 h-[2px] w-full
                     translate-x-[-100%] opacity-0
                     group-hover:translate-x-[100%] group-hover:opacity-100
                     group-hover:transition-transform group-hover:duration-700"
          style={{ background: MAGENTA_LASER }}
        />

        {/* tier glow (always subtle) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{ background: `radial-gradient(ellipse at 50% 0%,${glowColor} 0%,transparent 65%)` }}
        />

        {/* magenta glow on hover */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[2] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(236,72,153,0.10) 0%,transparent 65%)" }}
        />

        {/* tier badge */}
        <span
          className="absolute left-0 top-0 z-20 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em]"
          style={{ background: badge.bg, color: badge.color }}
        >
          {TIER_LABEL[item.tier]}
        </span>

        {/* status badge */}
        {item.equipped ? (
          <span className="absolute right-2 top-1 z-20 flex items-center gap-0.5 text-[9px] font-bold" style={{ color: "#c4b5fd" }}>
            <Sparkles className="h-2.5 w-2.5" /> აქტიური
          </span>
        ) : item.owned ? (
          <span className="absolute right-2 top-1 z-20 flex items-center gap-0.5 text-[9px] font-bold text-emerald-400">
            <Check className="h-2.5 w-2.5" /> შეძენილი
          </span>
        ) : null}

        {/* ── preview ── */}
        {isHero ? (
          <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image_url!}
              alt={item.name}
              draggable={false}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-2/3"
              style={{ background: "linear-gradient(to top,rgba(0,0,0,0.95) 0%,rgba(0,0,0,0.55) 50%,transparent 100%)" }}
            />
          </div>
        ) : (
          <div
            className={`relative z-[3] flex items-end justify-center overflow-hidden ${
              item.metadata?.effect === "fire_lobby" ? "h-28 p-0" : "h-28 px-3 pt-8"
            }`}
          >
            <ItemPreview item={item} />
          </div>
        )}

        {/* ── info + actions ── */}
        <div
          className={`relative z-[3] flex flex-1 flex-col gap-2 p-3 ${
            isHero ? "absolute inset-x-0 bottom-0" : "pt-2"
          }`}
        >
          <div>
            <p
              className={`font-display font-extrabold uppercase leading-tight tracking-tight text-white ${
                isHero ? "text-[15px] drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]" : "text-[12px]"
              }`}
            >
              {item.name}
            </p>
            {item.description && (
              <p
                className={`mt-0.5 line-clamp-2 leading-snug ${
                  isHero ? "text-[9px] text-white/60" : "text-[10px] text-[var(--gr-text-dim)]"
                }`}
              >
                {item.description}
              </p>
            )}
          </div>

          {/* price + action */}
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <span
              className="text-[13px] font-black tabular-nums"
              style={{ color: CURRENCY_COLOR[item.cost_currency] }}
            >
              {item.cost_amount} {CURRENCY_LABEL[item.cost_currency]}
            </span>

            {item.owned ? (
              <button
                type="button"
                onClick={handleEquip}
                disabled={isPending}
                className="flex h-7 items-center gap-1 px-2.5 text-[9px] font-black uppercase tracking-[0.1em] transition-all duration-200 disabled:opacity-50"
                style={{
                  clipPath: CUT_SM,
                  background: item.equipped
                    ? "color-mix(in srgb, #8b5cf6 22%, transparent)"
                    : "rgba(255,255,255,0.07)",
                  color: item.equipped ? "#c4b5fd" : "#e2e8f0",
                  outline: `1px solid ${item.equipped ? "rgba(196,181,253,0.45)" : "rgba(255,255,255,0.13)"}`,
                }}
              >
                {item.equipped ? <><Sparkles className="h-3 w-3" /> აქტიური</> : "გამოყენება"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePurchase}
                disabled={isPending}
                className="h-7 px-3 text-[10px] font-black uppercase tracking-[0.12em] text-black transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                style={{
                  clipPath: CUT_SM,
                  background: "linear-gradient(180deg,#f5c842 0%,#e6a800 55%,#c87f00 100%)",
                }}
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
    </div>
  );
}
