"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Package, Gift } from "lucide-react";
import type { EventBox, ItemTier, OpenBoxBundleResult, OpenBoxResult } from "@/types/events";
import { openBox, openBoxBundle } from "@/lib/events/actions";

const LobbyBoxOpenModal = dynamic(
  () => import("@/components/lobby/lobby-box-open-modal").then((m) => m.LobbyBoxOpenModal),
  { ssr: false }
);

const TIER_GLOW_BG: Record<ItemTier, string> = {
  common:    "from-slate-700/30 to-slate-900/60",
  rare:      "from-blue-700/30 to-slate-900/60",
  epic:      "from-violet-700/30 to-slate-900/60",
  legendary: "from-amber-600/30 to-slate-900/60",
};

const CURRENCY_LABEL: Record<string, string> = { nc: "NC", pro: "Pro" };
const CURRENCY_COLOR: Record<string, string> = {
  nc:  "text-[#C8D4DC]",
  pro: "text-[var(--gr-amber)]",
};

function CrateCard({ box, hasSession }: { box: EventBox; hasSession: boolean }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  // find the highest-tier item that has an image
  const featuredItem = [...box.items]
    .sort((a, b) => {
      const order = { legendary: 0, epic: 1, rare: 2, common: 3 };
      return order[a.tier as ItemTier] - order[b.tier as ItemTier];
    })
    .find((i) => i.image_url);

  // the top tier in this box (for gradient treatment)
  const topTier = (["legendary", "epic", "rare", "common"] as ItemTier[]).find((t) =>
    box.items.some((i) => i.tier === t)
  ) ?? "common";

  async function handleOpen(): Promise<OpenBoxResult> {
    const result = await openBox(box.id);
    if (result.success) router.refresh();
    return result;
  }

  async function handleOpenBundle(): Promise<OpenBoxBundleResult> {
    const result = await openBoxBundle(box.id, 10, 12);
    if (result.success) router.refresh();
    return result;
  }

  return (
    <>
      <div
        className="group relative flex flex-col overflow-hidden bg-[var(--gr-bg-1)] ring-1 ring-[var(--gr-border)] transition hover:ring-[var(--gr-border-hi)]"
        style={{ clipPath: "polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,0 100%)" }}
      >
        {/* image / hero area */}
        <div className={`relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br ${TIER_GLOW_BG[topTier]}`}>
          {/* subtle grid texture */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent 0 1px, rgba(255,255,255,0.5) 1px 2px), repeating-linear-gradient(90deg, transparent 0 1px, rgba(255,255,255,0.5) 1px 2px)",
              backgroundSize: "24px 24px",
            }}
          />

          {featuredItem?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={featuredItem.image_url}
              alt={featuredItem.item_name}
              loading="lazy"
              decoding="async"
              className="relative z-10 h-28 w-auto max-w-[90%] object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <Package className="relative z-10 h-14 w-14 text-[var(--gr-text-dim)]" />
          )}

          {/* top tier badge */}
          {topTier === "legendary" && (
            <span className="absolute right-2 top-2 bg-amber-400/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] text-amber-300 ring-1 ring-amber-400/40">
              LEGENDARY
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-3">
          {/* name + description */}
          <div>
            <p className="font-display text-[13px] font-extrabold uppercase tracking-tight text-[var(--gr-text)]">
              {box.name}
            </p>
            {box.description && (
              <p className="mt-0.5 text-[10px] leading-snug text-[var(--gr-text-dim)]">{box.description}</p>
            )}
          </div>

          {/* cost + open button */}
          <div className="mt-auto flex items-center justify-between gap-2">
            <span className={`text-[14px] font-black tabular-nums ${CURRENCY_COLOR[box.cost_currency]}`}>
              {box.cost_amount} <span className="text-[10px]">{CURRENCY_LABEL[box.cost_currency]}</span>
            </span>
            <button
              type="button"
              onClick={() => hasSession ? setModalOpen(true) : router.push("/auth/login")}
              className="h-8 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-black transition hover:brightness-110 active:scale-[0.97] [clip-path:polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,0_100%)]"
              style={{ background: "linear-gradient(180deg,#f5c842 0%,#e6a800 55%,#c87f00 100%)" }}
            >
              გახსენი
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <LobbyBoxOpenModal
          boxName={box.name}
          boxItems={box.items}
          costAmount={box.cost_amount}
          costCurrency={box.cost_currency}
          onClose={() => setModalOpen(false)}
          onOpen={handleOpen}
          onOpenBundle={handleOpenBundle}
        />
      )}
    </>
  );
}

type Props = {
  boxes: EventBox[];
  hasSession: boolean;
};

export function ShopCrates({ boxes, hasSession }: Props) {
  if (!boxes.length) return null;

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center gap-2 border-b border-[var(--gr-border)] pb-3">
        <Gift className="h-4 w-4 text-[var(--gr-amber)]" />
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--gr-text-dim)]">
          ყუთების გახსნა
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {boxes.map((box) => (
          <CrateCard key={box.id} box={box} hasSession={hasSession} />
        ))}
      </div>
    </section>
  );
}
