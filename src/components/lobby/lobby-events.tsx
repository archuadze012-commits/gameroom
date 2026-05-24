"use client";

import { useState } from "react";
import { Package, Gift } from "lucide-react";
import type { EventBox, ItemTier, OpenBoxResult } from "@/types/events";
import { openBox } from "@/lib/events/actions";
import { LobbyBoxOpenModal } from "@/components/lobby/lobby-box-open-modal";
import { useRouter } from "next/navigation";

const TIER_COLORS: Record<ItemTier, string> = {
  common:    "bg-slate-500/20 text-slate-300 ring-slate-500/30",
  rare:      "bg-blue-500/20 text-blue-300 ring-blue-500/40",
  epic:      "bg-violet-500/20 text-violet-300 ring-violet-500/40",
  legendary: "bg-amber-400/20 text-amber-300 ring-amber-400/50",
};

const TIER_DOT: Record<ItemTier, string> = {
  common:    "bg-slate-400",
  rare:      "bg-blue-400",
  epic:      "bg-violet-400",
  legendary: "bg-amber-400",
};

const CURRENCY_LABEL: Record<string, string> = { nc: "NC", pro: "Pro" };
const CURRENCY_COLOR: Record<string, string> = {
  nc:  "text-[#C8D4DC]",
  pro: "text-[var(--gr-amber)]",
};

function tierWeightToPercent(weight: number, total: number) {
  return ((weight / total) * 100).toFixed(0);
}

function BoxCard({ box, hasSession }: { box: EventBox; hasSession: boolean }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const totalWeight = box.items.reduce((s, i) => s + i.weight, 0);

  const tierSummary = (["legendary", "epic", "rare", "common"] as ItemTier[]).map((tier) => {
    const items = box.items.filter((i) => i.tier === tier);
    const w = items.reduce((s, i) => s + i.weight, 0);
    return { tier, count: items.length, pct: totalWeight > 0 ? tierWeightToPercent(w, totalWeight) : "0" };
  }).filter((t) => t.count > 0);

  async function handleOpen(): Promise<OpenBoxResult> {
    const result = await openBox(box.id);
    if (result.success) router.refresh();
    return result;
  }

  return (
    <>
      <div
        className="flex flex-col bg-[var(--gr-bg-1)] ring-1 ring-[var(--gr-border)] transition hover:ring-[var(--gr-border-hi)]"
        style={{ clipPath: "polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%)" }}
      >
        {/* box icon area */}
        <div className="flex h-28 items-center justify-center bg-gradient-to-br from-[var(--gr-bg-2)] to-[var(--gr-bg-0)]">
          {box.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={box.image_url} alt={box.name} className="h-20 w-20 object-contain" />
          ) : (
            <Package className="h-14 w-14 text-[var(--gr-text-dim)]" />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-3">
          <div>
            <p className="font-display text-[13px] font-extrabold uppercase tracking-tight text-[var(--gr-text)]">
              {box.name}
            </p>
            {box.description && (
              <p className="mt-0.5 text-[10px] leading-snug text-[var(--gr-text-dim)]">{box.description}</p>
            )}
          </div>

          {/* drop rate dots */}
          <div className="flex flex-wrap gap-1.5">
            {tierSummary.map(({ tier, pct }) => (
              <span
                key={tier}
                className={`inline-flex items-center gap-1 rounded-none px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] ring-1 ${TIER_COLORS[tier]}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${TIER_DOT[tier]}`} />
                {tier} {pct}%
              </span>
            ))}
          </div>

          {/* cost + open button */}
          <div className="mt-auto flex items-center justify-between gap-2">
            <span className={`text-[13px] font-black tabular-nums ${CURRENCY_COLOR[box.cost_currency]}`}>
              {box.cost_amount} {CURRENCY_LABEL[box.cost_currency]}
            </span>
            <button
              type="button"
              onClick={() => hasSession ? setModalOpen(true) : router.push("/auth/login")}
              className="h-7 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-black transition hover:brightness-110 active:scale-[0.97] [clip-path:polygon(0_0,calc(100%-7px)_0,100%_7px,100%_100%,0_100%)]"
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
          onClose={() => setModalOpen(false)}
          onOpen={handleOpen}
        />
      )}
    </>
  );
}

type Props = {
  boxes: EventBox[];
  hasSession: boolean;
};

export function LobbyEvents({ boxes, hasSession }: Props) {
  if (!boxes.length) return null;

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <Gift className="h-4 w-4 text-[var(--gr-amber)]" />
        <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--gr-text-dim)]">
          ივენთები — ყუთების გახსნა
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {boxes.map((box) => (
          <BoxCard key={box.id} box={box} hasSession={hasSession} />
        ))}
      </div>
    </section>
  );
}
