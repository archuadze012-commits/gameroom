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
  common:    "from-slate-500/30 to-slate-900/60",
  rare:      "from-blue-500/30 to-slate-900/60",
  epic:      "from-violet-500/30 to-slate-900/60",
  legendary: "from-amber-500/30 to-slate-900/60",
};

const CURRENCY_LABEL: Record<string, string> = { nc: "Botcoin", pro: "Pro" };
const CURRENCY_COLOR: Record<string, string> = {
  nc:  "text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]",
  pro: "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]",
};

function CrateCard({ box, hasSession }: { box: EventBox; hasSession: boolean }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const normalizedName = box.name.trim().toLowerCase();
  const isFullCoverCrate = normalizedName === "caucasian icefire" || normalizedName === "კავკასიის აჩრდილი" || normalizedName === "classic crate";
  const heroHeightClass = isFullCoverCrate ? "" : "min-h-[220px] sm:min-h-[240px]";
  const heroImageClass = isFullCoverCrate
    ? "relative z-10 block h-auto w-full object-cover drop-shadow-[0_16px_18px_rgba(0,0,0,0.72)] transition-transform duration-500 group-hover:scale-[1.02]"
    : "relative z-10 h-[220px] w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-[240px]";

  const featuredItem = [...box.items]
    .sort((a, b) => {
      const order = { legendary: 0, epic: 1, rare: 2, common: 3 };
      return order[a.tier as ItemTier] - order[b.tier as ItemTier];
    })
    .find((i) => i.image_url);

  const topTier = (["legendary", "epic", "rare", "common"] as ItemTier[]).find((t) =>
    box.items.some((i) => i.tier === t)
  ) ?? "common";

  async function handleOpen(): Promise<OpenBoxResult> {
    const result = await openBox(box.id);
    if (result.success) router.refresh();
    return result;
  }

  async function handleOpenBundle(): Promise<OpenBoxBundleResult> {
    const result = await openBoxBundle(box.id);
    if (result.success) router.refresh();
    return result;
  }

  return (
    <>
      <article className="group neon-frame flex h-full flex-col rounded-[24px]">
        <div className={`pointer-events-none absolute inset-[3px] rounded-[21px] bg-gradient-to-br ${TIER_GLOW_BG[topTier]} opacity-0 transition-opacity duration-300 group-hover:opacity-10`} />

        <div className="relative flex flex-1 flex-col overflow-hidden rounded-[21px] bg-[#0a0714]/80 backdrop-blur-md">
          {/* image / hero area */}
          <div className={`relative ${isFullCoverCrate ? "block" : "grid place-items-center"} overflow-hidden rounded-t-[21px] bg-gradient-to-br ${TIER_GLOW_BG[topTier]} ${heroHeightClass} border-b border-white/5`}>
            
            <div aria-hidden className="absolute inset-x-5 bottom-7 h-px bg-[linear-gradient(90deg,transparent,rgba(245,158,11,0.5),rgba(236,72,153,0.5),transparent)]" />
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.06)_46%,transparent_52%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            {box.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={box.image_url}
                alt={box.name}
                className={heroImageClass}
              />
            ) : featuredItem?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={featuredItem.image_url}
                alt={featuredItem.item_name}
                className="relative z-10 h-32 w-auto max-w-[92%] object-contain drop-shadow-[0_16px_18px_rgba(0,0,0,0.72)] transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <Package className="relative z-10 h-14 w-14 text-white/40 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
            )}

            {/* top tier badge */}
            {topTier === "legendary" && (
              <span className="absolute left-3 top-3 z-20 rounded-full border border-amber-500/50 bg-amber-500/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] backdrop-blur-md">
                LEGENDARY
              </span>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-4 p-5">
            <div>
              <p className="font-display text-[18px] font-black uppercase leading-tight text-white transition-colors group-hover:text-pink-400">
                {box.name}
              </p>
            </div>

            <div className="mt-auto flex items-center justify-between gap-3 pt-2">
              <span className={`font-display text-[20px] font-black tabular-nums ${CURRENCY_COLOR[box.cost_currency]}`}>
                {box.cost_amount} <span className="text-[10px] uppercase">{CURRENCY_LABEL[box.cost_currency]}</span>
              </span>
              <button
                type="button"
                onClick={() => hasSession ? setModalOpen(true) : router.push("/auth/login")}
                className="flex h-10 items-center justify-center rounded-full border border-pink-500/50 bg-[linear-gradient(90deg,#ec4899,#8b5cf6)] px-6 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(236,72,153,0.6)] active:scale-95"
              >
                გახსენი
              </button>
            </div>
          </div>
        </div>
      </article>

      {modalOpen && (
        <LobbyBoxOpenModal
          boxName={box.name}
          boxImageUrl={box.image_url}
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
  embedded?: boolean;
};

export function ShopCrates({ boxes, hasSession, embedded = false }: Props) {
  const premiumBoxNames = new Set(["classic crate", "კავკასიის აჩრდილი", "caucasian icefire"]);
  const premiumBoxes = boxes.filter((box) => premiumBoxNames.has(box.name.trim().toLowerCase()));

  if (!premiumBoxes.length) return null;

  return (
    <section className={embedded ? "" : "mt-10"}>
      {!embedded && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]">
              <Gift className="h-4 w-4" />
              Premium shop
            </p>
            <h2 className="font-display text-2xl font-black uppercase text-white drop-shadow-md">
              პრემიუმ შოპი
            </h2>
          </div>
          <p className="max-w-xl text-[14px] leading-relaxed text-white/50 font-medium">
            აქ ჩანს მხოლოდ ორი სპეციალური crate.
          </p>
        </div>
      )}
      <div className={`grid gap-5 ${embedded ? "sm:grid-cols-2 lg:grid-cols-3" : ""}`}>
        {premiumBoxes.map((box) => (
          <CrateCard key={box.id} box={box} hasSession={hasSession} />
        ))}
      </div>
    </section>
  );
}
