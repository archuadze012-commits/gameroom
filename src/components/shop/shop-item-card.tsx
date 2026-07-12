"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Sparkles, Lock, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ShopItem, ShopTier } from "@/types/shop";
import { purchaseShopItem } from "@/lib/shop/actions";
import { equipItem, unequipCategory } from "@/lib/shop/equip-actions";
import { LobbyFireEffect } from "@/components/lobby/lobby-fire-effect";

/* ─── Tier colours ──────────────────────────────────────── */
const TIER_TOP_GRAD: Record<ShopTier, string> = {
  common:    "from-slate-500/50 via-slate-400/20 to-transparent",
  rare:      "from-blue-500/50 via-blue-400/20 to-transparent",
  epic:      "from-violet-500/50 via-violet-400/20 to-transparent",
  legendary: "from-amber-500/50 via-amber-400/20 to-transparent",
};
const TIER_BADGE_STYLE: Record<ShopTier, { border: string; bg: string; color: string; shadow: string }> = {
  common:    { border: "border-slate-500/30", bg: "bg-slate-500/10", color: "text-slate-300", shadow: "shadow-[0_0_10px_rgba(100,116,139,0.2)]" },
  rare:      { border: "border-blue-500/30", bg: "bg-blue-500/10", color: "text-blue-300", shadow: "shadow-[0_0_10px_rgba(59,130,246,0.2)]" },
  epic:      { border: "border-violet-500/30", bg: "bg-violet-500/10", color: "text-violet-300", shadow: "shadow-[0_0_10px_rgba(139,92,246,0.2)]" },
  legendary: { border: "border-amber-500/30", bg: "bg-amber-500/10", color: "text-amber-300", shadow: "shadow-[0_0_10px_rgba(245,158,11,0.2)]" },
};
const TIER_LABEL: Record<ShopTier, string> = {
  common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary",
};
const CURRENCY_COLOR: Record<string, string> = {
  nc: "text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]",
  pro: "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]",
};
const CURRENCY_LABEL: Record<string, string> = { nc: "NC", pro: "Pro" };

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
        <div className="flex h-10 w-24 items-center justify-center rounded-lg border border-blue-500/30 bg-[linear-gradient(135deg,#1e3a8a,#172554)] shadow-[0_0_15px_rgba(30,58,138,0.3)]">
          <span className="text-[9px] font-black uppercase tracking-[0.12em] text-blue-300">Name Card</span>
        </div>
      </div>
    );

  if (item.category === "cover" && meta.gradient)
    return <div className={`h-12 w-full rounded-md bg-gradient-to-r ${meta.gradient as string} ring-1 ring-white/10`} />;

  if (item.category === "profile_theme" && meta.bg)
    return <div className={`h-16 w-24 rounded-md bg-gradient-to-br ${meta.bg as string} ring-1 ring-white/10`} />;

  if (item.category === "character") {
    if (item.image_url)
      return (
        <div className="relative w-full overflow-hidden" style={{ height: 160 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image_url} alt={item.name} draggable={false}
            className="absolute inset-0 h-full w-full object-cover object-top" />
        </div>
      );
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
        <span className="text-2xl drop-shadow-md">🎭</span>
      </div>
    );
  }

  if (item.category === "combo") {
    if (item.image_url)
      return (
        <div className="relative w-full overflow-hidden" style={{ height: 160 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image_url} alt={item.name} draggable={false}
            className="absolute inset-0 h-full w-full object-cover object-center" />
          <span className="absolute left-3 top-3 z-10 rounded-full border border-amber-500/50 bg-amber-500/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)] backdrop-blur-md">
            Combo
          </span>
        </div>
      );
    return (
      <div className="flex h-16 w-20 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
        <span className="text-2xl drop-shadow-md">👑</span>
      </div>
    );
  }

  if (item.category === "vehicle") {
    if (item.image_url)
      return (
        <div className="relative w-full overflow-hidden" style={{ height: 150 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image_url} alt={item.name} draggable={false}
            className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_16px_18px_rgba(0,0,0,0.72)]" />
        </div>
      );
    return (
      <div className="flex h-16 w-20 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
        <span className="text-2xl drop-shadow-md">🚗</span>
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

  const topGrad       = TIER_TOP_GRAD[item.tier];
  const badge         = TIER_BADGE_STYLE[item.tier];
  const isHero        = (item.category === "character" || item.category === "combo") && !!item.image_url;
  // Referral-exclusive cosmetic: not buyable — unlocked by inviting friends.
  const isReferral    = item.cost_currency === "referral";

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
    <article className="group neon-frame flex h-full flex-col rounded-[24px]">
      <div className={`pointer-events-none absolute inset-[3px] rounded-[21px] bg-gradient-to-br ${topGrad} opacity-0 transition-opacity duration-300 group-hover:opacity-10`} />

      <div className="relative flex flex-1 flex-col overflow-hidden rounded-[21px] bg-[#0a0714]/80 backdrop-blur-md">
        
        <div className="relative grid min-h-[190px] place-items-center overflow-hidden rounded-t-[21px] bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.05),transparent_60%)] border-b border-white/5">
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.06)_46%,transparent_52%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <span
            className={`absolute left-3 top-3 z-20 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] backdrop-blur-md ${badge.border} ${badge.bg} ${badge.color} ${badge.shadow}`}
          >
            {TIER_LABEL[item.tier]}
          </span>

          {item.equipped ? (
            <span className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)] backdrop-blur-md">
              <Sparkles className="h-3 w-3" /> აქტიური
            </span>
          ) : item.owned ? (
            <span className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)] backdrop-blur-md">
              <Check className="h-3 w-3" /> შეძენილი
            </span>
          ) : null}

          {isHero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url!}
              alt={item.name}
              draggable={false}
              className="relative z-[2] h-[190px] w-full object-cover object-top drop-shadow-[0_16px_18px_rgba(0,0,0,0.72)] transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className={`relative z-[2] flex w-full items-center justify-center ${
                item.metadata?.effect === "fire_lobby" ? "h-[190px] p-0" : "h-[190px] px-4 pt-8"
              } transition-transform duration-500 group-hover:scale-[1.04]`}
            >
              <ItemPreview item={item} />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4 p-5">
            <div>
              <p className="font-display text-[18px] font-black uppercase leading-tight text-white transition-colors group-hover:text-pink-400">
                {item.name}
              </p>

            </div>

            {/* price + action */}
            <div className="mt-auto flex items-center justify-between gap-3 pt-2">
              {isReferral ? (
                <span className="flex items-center gap-1.5 font-display text-[13px] font-black uppercase tracking-wider text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                  <UserPlus className="h-4 w-4" /> {item.cost_amount} მოწვევა
                </span>
              ) : (
                <span className={`font-display text-[20px] font-black tabular-nums ${CURRENCY_COLOR[item.cost_currency]}`}>
                  {item.cost_amount} {CURRENCY_LABEL[item.cost_currency]}
                </span>
              )}

              {item.owned ? (
                <button
                  type="button"
                  onClick={handleEquip}
                  disabled={isPending}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-full px-5 text-[10px] font-black uppercase tracking-[0.16em] transition-all duration-300 disabled:opacity-50 ${
                    item.equipped
                      ? "border border-amber-500/40 bg-amber-500/20 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:bg-amber-500/30"
                      : "border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:bg-cyan-500/20 hover:scale-105"
                  }`}
                >
                  {item.equipped ? <><Sparkles className="h-3.5 w-3.5" /> აქტიური</> : "გამოყენება"}
                </button>
              ) : isReferral ? (
                <Link
                  href="/invite"
                  className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300 transition-all hover:scale-105 hover:bg-cyan-500/20"
                >
                  <Lock className="h-3.5 w-3.5" /> მოწვევით
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handlePurchase}
                  disabled={isPending}
                  className="flex h-10 items-center justify-center rounded-full border border-pink-500/50 bg-[linear-gradient(90deg,#ec4899,#8b5cf6)] px-6 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(236,72,153,0.6)] disabled:opacity-50"
                >
                  {isPending ? "..." : "ყიდვა"}
                </button>
              )}
            </div>

          {feedback && (
            <p className={`text-[11px] font-black uppercase tracking-widest mt-1 ${feedback.type === "success" ? "text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]"}`}>
              {feedback.msg}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
