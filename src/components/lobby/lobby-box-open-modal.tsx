"use client";

import { useEffect, useState } from "react";
import { X, Package } from "lucide-react";
import type { OpenBoxResult } from "@/types/events";

const TIER_COLORS: Record<string, string> = {
  common:    "from-slate-500/40 to-slate-700/40 border-slate-400/40",
  rare:      "from-blue-500/40 to-blue-700/40 border-blue-400/60",
  epic:      "from-violet-500/40 to-fuchsia-700/40 border-violet-400/60",
  legendary: "from-amber-400/40 to-orange-600/40 border-amber-400/80",
};
const TIER_GLOW: Record<string, string> = {
  common:    "shadow-[0_0_32px_rgba(148,163,184,0.4)]",
  rare:      "shadow-[0_0_40px_rgba(59,130,246,0.55)]",
  epic:      "shadow-[0_0_48px_rgba(139,92,246,0.65)]",
  legendary: "shadow-[0_0_56px_rgba(245,196,66,0.8)]",
};
const TIER_LABEL: Record<string, string> = {
  common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary",
};
const TIER_TEXT: Record<string, string> = {
  common:    "text-slate-300",
  rare:      "text-blue-300",
  epic:      "text-violet-300",
  legendary: "text-amber-300",
};
const TYPE_LABEL: Record<string, string> = {
  cosmetic: "Cosmetic", badge: "Badge",
  character_skin: "Character Skin", weapon_skin: "Weapon Skin",
};

type Props = {
  boxName: string;
  onClose: () => void;
  onOpen: () => Promise<OpenBoxResult>;
};

type Phase = "idle" | "shaking" | "revealing" | "done";

export function LobbyBoxOpenModal({ boxName, onClose, onOpen }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<OpenBoxResult | null>(null);

  async function handleOpen() {
    if (phase !== "idle") return;
    setPhase("shaking");

    await new Promise((r) => setTimeout(r, 700));
    const res = await onOpen();
    setResult(res);

    if (res.success) {
      setPhase("revealing");
      await new Promise((r) => setTimeout(r, 100));
      setPhase("done");
    } else {
      setPhase("idle");
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tier = result?.success ? result.item.tier : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={phase === "done" || phase === "idle" ? onClose : undefined} />

      <div className="relative z-10 w-full max-w-sm">
        {/* close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-2 -top-2 z-20 grid h-7 w-7 place-items-center bg-[var(--gr-bg-1)] ring-1 ring-[var(--gr-border)] text-[var(--gr-text-mute)] hover:text-white transition"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div
          className="relative overflow-hidden bg-[var(--gr-bg-1)] p-6 ring-1 ring-[var(--gr-border)]"
          style={{ clipPath: "polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,0 100%)" }}
        >
          <p className="mb-5 text-center text-[10px] font-black uppercase tracking-[0.18em] text-[var(--gr-text-dim)]">
            {boxName}
          </p>

          {/* box icon / item reveal */}
          <div className="flex justify-center">
            {phase !== "done" ? (
              <div
                className={`flex h-32 w-32 items-center justify-center rounded-none border bg-gradient-to-br from-[var(--gr-bg-2)] to-[var(--gr-bg-0)] border-[var(--gr-border)] ${phase === "shaking" ? "box-shake" : ""}`}
                style={{ clipPath: "polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%)" }}
              >
                <Package className="h-16 w-16 text-[var(--gr-text-dim)]" />
              </div>
            ) : result?.success ? (
              <div
                className={`item-reveal relative flex h-32 w-32 flex-col items-center justify-center border bg-gradient-to-br ${TIER_COLORS[tier!]} ${TIER_GLOW[tier!]}`}
                style={{ clipPath: "polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%)" }}
              >
                <div className={`tier-glow-pulse absolute inset-0 bg-gradient-to-br ${TIER_COLORS[tier!]} opacity-50`} />
                <span className="relative z-10 text-4xl">
                  {tier === "legendary" ? "👑" : tier === "epic" ? "✨" : tier === "rare" ? "💎" : "📦"}
                </span>
              </div>
            ) : null}
          </div>

          {/* item info after reveal */}
          {phase === "done" && result?.success && (
            <div className="mt-5 text-center">
              <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${TIER_TEXT[tier!]}`}>
                {TIER_LABEL[tier!]}
              </p>
              <p className="mt-1 font-display text-[18px] font-extrabold uppercase tracking-tight text-white">
                {result.item.name}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--gr-text-dim)]">
                {TYPE_LABEL[result.item.item_type]}
              </p>
            </div>
          )}

          {/* error */}
          {phase === "idle" && result && !result.success && (
            <p className="mt-4 text-center text-[11px] text-red-400">
              {result.error === "insufficient_funds" ? "არასაკმარისი ბალანსი" :
               result.error === "not_authenticated" ? "გაიარე ავტორიზაცია" :
               "შეცდომა — სცადე თავიდან"}
            </p>
          )}

          {/* action buttons */}
          <div className="mt-5 flex justify-center gap-3">
            {phase === "done" ? (
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-6 text-[10px] font-black uppercase tracking-[0.16em] text-black [clip-path:polygon(0_0,calc(100%-9px)_0,100%_9px,100%_100%,0_100%)]"
                style={{ background: "linear-gradient(180deg,#f5c842 0%,#e6a800 55%,#c87f00 100%)" }}
              >
                დახურვა
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpen}
                disabled={phase === "shaking"}
                className="h-9 px-6 text-[10px] font-black uppercase tracking-[0.16em] text-black transition [clip-path:polygon(0_0,calc(100%-9px)_0,100%_9px,100%_100%,0_100%)] disabled:opacity-50"
                style={{ background: "linear-gradient(180deg,#f5c842 0%,#e6a800 55%,#c87f00 100%)" }}
              >
                {phase === "shaking" ? "იხსნება..." : "გახსენი"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
