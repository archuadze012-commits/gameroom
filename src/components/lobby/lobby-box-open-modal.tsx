"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Crown, Gem, Gift, Loader2, Package, Sparkles, X, Zap } from "lucide-react";
import type { BoxItem, ItemTier, OpenBoxBundleResult, OpenBoxResult, OpenedBoxItem } from "@/types/events";

const TIER_CARD: Record<ItemTier, string> = {
  common:    "border-slate-500/35 from-slate-700/70 via-slate-900/85 to-[var(--gr-bg-0)]",
  rare:      "border-cyan-300/60 from-cyan-500/70 via-blue-950/85 to-[var(--gr-bg-0)]",
  epic:      "border-violet-300/70 from-violet-500/75 via-fuchsia-950/85 to-[var(--gr-bg-0)]",
  legendary: "border-amber-300/85 from-amber-400/80 via-orange-950/90 to-[var(--gr-bg-0)]",
};

const TIER_TEXT: Record<ItemTier, string> = {
  common:    "text-slate-300",
  rare:      "text-cyan-200",
  epic:      "text-violet-200",
  legendary: "text-amber-200",
};

const TIER_RING: Record<ItemTier, string> = {
  common:    "ring-slate-400/25",
  rare:      "ring-cyan-300/45",
  epic:      "ring-violet-300/55",
  legendary: "ring-amber-300/70",
};

const TIER_HALO: Record<ItemTier, string> = {
  common:    "bg-slate-400/20",
  rare:      "bg-cyan-300/25",
  epic:      "bg-violet-300/30",
  legendary: "bg-amber-300/40",
};

const TIER_SHADOW: Record<ItemTier, string> = {
  common:    "drop-shadow-[0_0_18px_rgba(148,163,184,0.45)]",
  rare:      "drop-shadow-[0_0_24px_rgba(34,211,238,0.65)]",
  epic:      "drop-shadow-[0_0_30px_rgba(167,139,250,0.75)]",
  legendary: "drop-shadow-[0_0_38px_rgba(245,165,36,0.95)]",
};

const TIER_LABEL: Record<ItemTier, string> = {
  common: "COMMON",
  rare: "RARE",
  epic: "EPIC",
  legendary: "LEGENDARY",
};

const TYPE_LABEL: Record<string, string> = {
  cosmetic: "კოსმეტიკა",
  badge: "ბეჯი",
  character_skin: "ჩარაქტერი",
  weapon_skin: "იარაღი",
};

const CARD_W = 118;
const CARD_H = 132;
const CARD_GAP = 10;
const CARD_STEP = CARD_W + CARD_GAP;
const WINNER_IDX = 54;
const REEL_TOTAL = 72;
const SPIN_MS = 6200;

type OpenBoxError = Extract<OpenBoxResult, { success: false }>["error"];
const CURRENCY_LABEL: Record<"nc" | "pro", string> = { nc: "NC", pro: "Pro" };

type SpinSummary = {
  paidOpens: number;
  totalOpens: number;
  bonusAwarded: number;
};

function pickWeighted(items: BoxItem[]): BoxItem {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let rand = Math.random() * total;

  for (const item of items) {
    rand -= item.weight;
    if (rand <= 0) return item;
  }

  return items[items.length - 1];
}

function pickNearMiss(items: BoxItem[], winner: BoxItem): BoxItem {
  const premiumPool = items.filter((item) =>
    item.id !== winner.id && (item.tier === winner.tier || item.tier === "legendary" || item.tier === "epic")
  );

  return pickWeighted(premiumPool.length ? premiumPool : items);
}

function buildReel(items: BoxItem[], winner: BoxItem): BoxItem[] {
  const pool = items.length > 0 ? items : [winner];

  return Array.from({ length: REEL_TOTAL }, (_, i) => {
    if (i === WINNER_IDX) return winner;
    if (i === WINNER_IDX - 1 || i === WINNER_IDX + 1) return pickNearMiss(pool, winner);
    return pickWeighted(pool);
  });
}

function asBoxItem(item: OpenedBoxItem): BoxItem {
  return {
    id: item.id,
    item_name: item.name,
    item_type: item.item_type,
    tier: item.tier,
    image_url: item.image_url,
    weight: 1,
  };
}

function errorMessage(error: OpenBoxError) {
  if (error === "insufficient_funds") return "არასაკმარისი ბალანსი";
  if (error === "not_authenticated") return "გაიარე ავტორიზაცია";
  if (error === "box_not_found") return "ყუთი ვერ მოიძებნა";
  return "შეცდომა - სცადე თავიდან";
}

type TierGlyphProps = {
  tier: ItemTier;
  className?: string;
};

function TierGlyph({ tier, className = "" }: TierGlyphProps) {
  if (tier === "legendary") return <Crown className={className} />;
  if (tier === "epic") return <Sparkles className={className} />;
  if (tier === "rare") return <Gem className={className} />;
  return <Package className={className} />;
}

type ReelItemCardProps = {
  item: BoxItem;
  isWinner?: boolean;
};

function ReelItemCard({ item, isWinner = false }: ReelItemCardProps) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden border bg-gradient-to-br p-2 ring-1 ${TIER_CARD[item.tier]} ${TIER_RING[item.tier]} ${
        isWinner ? "scale-[1.03]" : ""
      } [clip-path:polygon(0_0,calc(100%_-_12px)_0,100%_12px,100%_100%,0_100%)]`}
      style={{ width: CARD_W, height: CARD_H }}
    >
      <div aria-hidden className="crate-grid pointer-events-none absolute inset-0 opacity-35" />
      <div aria-hidden className={`pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl ${TIER_HALO[item.tier]}`} />
      <div className="relative z-10 flex h-full flex-col items-center justify-between">
        <div className={`self-start text-[8px] font-black uppercase tracking-[0.18em] ${TIER_TEXT[item.tier]}`}>
          {TIER_LABEL[item.tier]}
        </div>

        <div className="grid h-16 w-full place-items-center">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt={item.item_name}
              className={`max-h-16 max-w-[92%] object-contain ${TIER_SHADOW[item.tier]}`}
            />
          ) : (
            <TierGlyph tier={item.tier} className={`h-9 w-9 ${TIER_TEXT[item.tier]} ${TIER_SHADOW[item.tier]}`} />
          )}
        </div>

        <p className="line-clamp-1 w-full text-center font-display text-[10px] font-extrabold uppercase tracking-tight text-white">
          {item.item_name}
        </p>
      </div>
    </div>
  );
}

type Phase = "idle" | "loading" | "spinning" | "done";

type Props = {
  boxName: string;
  boxItems: BoxItem[];
  costAmount: number;
  costCurrency: "nc" | "pro";
  onClose: () => void;
  onOpen: () => Promise<OpenBoxResult>;
  onOpenBundle: () => Promise<OpenBoxBundleResult>;
};

export function LobbyBoxOpenModal({
  boxName,
  boxItems,
  costAmount,
  costCurrency,
  onClose,
  onOpen,
  onOpenBundle,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<OpenBoxResult | null>(null);
  const [bundleResult, setBundleResult] = useState<OpenBoxBundleResult | null>(null);
  const [openedItems, setOpenedItems] = useState<OpenedBoxItem[]>([]);
  const [currentSpinIndex, setCurrentSpinIndex] = useState(0);
  const [summary, setSummary] = useState<SpinSummary | null>(null);
  const [reel, setReel] = useState<BoxItem[]>([]);
  const stripRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase !== "spinning" && phase !== "loading") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, phase]);

  function startSpinSequence(items: OpenedBoxItem[], nextSummary: SpinSummary) {
    if (!items.length) {
      setPhase("idle");
      return;
    }

    setOpenedItems(items);
    setSummary(nextSummary);
    setCurrentSpinIndex(0);
    setReel(buildReel(boxItems, asBoxItem(items[0])));
    setPhase("spinning");
  }

  async function handleOpenSingle() {
    if (phase !== "idle") return;
    setPhase("loading");
    setBundleResult(null);

    const res = await onOpen();
    setResult(res);

    if (!res.success) {
      setPhase("idle");
      return;
    }

    startSpinSequence([res.item], { paidOpens: 1, totalOpens: 1, bonusAwarded: 0 });
  }

  async function handleOpenBundle() {
    if (phase !== "idle") return;
    setPhase("loading");
    setResult(null);

    const res = await onOpenBundle();
    setBundleResult(res);

    if (!res.success) {
      setPhase("idle");
      return;
    }

    startSpinSequence(res.items, {
      paidOpens: res.paidOpens,
      totalOpens: res.totalOpens,
      bonusAwarded: res.bonusAwarded,
    });
  }

  useEffect(() => {
    if (phase !== "spinning") return;

    let startTimer: ReturnType<typeof setTimeout> | undefined;
    let doneTimer: ReturnType<typeof setTimeout> | undefined;

    const raf = requestAnimationFrame(() => {
      if (!stripRef.current || !containerRef.current) return;

      const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 900 : SPIN_MS;
      const cw = containerRef.current.offsetWidth;
      const centerOffset = (cw - CARD_W) / 2;
      const winnerLeft = WINNER_IDX * CARD_STEP;
      const tx = -(winnerLeft - centerOffset);

      stripRef.current.style.transition = "none";
      stripRef.current.style.transform = "translate3d(0,0,0)";

      startTimer = setTimeout(() => {
        if (!stripRef.current) return;
        stripRef.current.style.transition = `transform ${duration}ms cubic-bezier(0.05, 0.82, 0.08, 1)`;
        stripRef.current.style.transform = `translate3d(${tx}px,0,0)`;
      }, 40);

      doneTimer = setTimeout(() => setPhase("done"), duration + 120);
    });

    return () => {
      cancelAnimationFrame(raf);
      if (startTimer) clearTimeout(startTimer);
      if (doneTimer) clearTimeout(doneTimer);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "done") return;
    if (currentSpinIndex >= openedItems.length - 1) return;

    const pauseMs = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 120 : 620;
    const nextTimer = setTimeout(() => {
      const nextIndex = currentSpinIndex + 1;
      setCurrentSpinIndex(nextIndex);
      setReel(buildReel(boxItems, asBoxItem(openedItems[nextIndex])));
      setPhase("spinning");
    }, pauseMs);

    return () => clearTimeout(nextTimer);
  }, [boxItems, currentSpinIndex, openedItems, phase]);

  const activeItem = openedItems[currentSpinIndex] ?? (result?.success ? result.item : null);
  const tier = activeItem?.tier ?? null;
  const canClose = phase === "idle" || (phase === "done" && currentSpinIndex >= openedItems.length - 1);
  const activeError = result && !result.success ? result.error : bundleResult && !bundleResult.success ? bundleResult.error : null;
  const bundlePrice = costAmount * 10;
  const bundleCompleted = !!summary && summary.totalOpens > 1 && currentSpinIndex >= openedItems.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,color-mix(in_srgb,var(--gr-violet)_24%,transparent),transparent_34%),radial-gradient(circle_at_50%_80%,color-mix(in_srgb,var(--gr-amber)_18%,transparent),transparent_34%),rgba(0,0,0,0.88)] backdrop-blur-lg"
        onClick={canClose ? onClose : undefined}
      />

      <div className="relative z-10 w-full max-w-[860px]">
        <button
          type="button"
          onClick={onClose}
          disabled={!canClose}
          aria-label="დახურვა"
          className="absolute -right-1 -top-1 z-30 grid h-9 w-9 place-items-center bg-[color-mix(in_srgb,var(--gr-bg-1)_88%,black)] text-[var(--gr-text-mute)] ring-1 ring-[var(--gr-border-hi)] transition hover:bg-[var(--gr-bg-2)] hover:text-white disabled:cursor-not-allowed disabled:opacity-35 [clip-path:polygon(0_0,100%_0,100%_100%,9px_100%,0_calc(100%_-_9px))]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative overflow-hidden bg-[color-mix(in_srgb,var(--gr-bg-1)_92%,black)] shadow-[0_30px_110px_rgba(0,0,0,0.75)] ring-1 ring-[color-mix(in_srgb,var(--gr-amber)_45%,var(--gr-border))] [clip-path:polygon(0_0,calc(100%_-_28px)_0,100%_28px,100%_100%,0_100%)]">
          <div aria-hidden className="crate-grid pointer-events-none absolute inset-0 opacity-35" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--gr-cyan-glow),var(--gr-amber),transparent)]" />
          <div aria-hidden className="pointer-events-none absolute -left-24 top-8 h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--gr-cyan-glow)_16%,transparent)] blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-[color-mix(in_srgb,var(--gr-amber)_16%,transparent)] blur-3xl" />

          <div className="relative z-10 border-b border-[var(--gr-border)] px-5 py-4 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[var(--gr-cyan-glow)]">
                  PREMIUM DROP
                </p>
                <h2 className="mt-1 font-display text-[22px] font-extrabold uppercase tracking-tight text-white sm:text-[30px]">
                  {boxName}
                </h2>
              </div>

              <div className="hidden items-center gap-2 bg-black/30 px-3 py-2 ring-1 ring-[var(--gr-border)] backdrop-blur-md [clip-path:polygon(0_0,calc(100%_-_10px)_0,100%_10px,100%_100%,0_100%)] sm:flex">
                <span className="crate-chip-flicker h-2 w-2 rounded-full bg-[var(--gr-cyan-glow)] shadow-[0_0_12px_var(--gr-cyan-glow)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--gr-text-mute)]">
                  SECURE SPIN
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 px-4 py-5 sm:px-8 sm:py-7">
            {(phase === "idle" || phase === "loading") && (
              <div className="grid gap-5 md:grid-cols-[1fr_1.2fr] md:items-center">
                <div className="relative mx-auto grid h-44 w-44 place-items-center sm:h-52 sm:w-52">
                  <div aria-hidden className="absolute inset-0 rounded-full bg-[conic-gradient(from_180deg,transparent,color-mix(in_srgb,var(--gr-cyan-glow)_34%,transparent),transparent,color-mix(in_srgb,var(--gr-amber)_38%,transparent),transparent)] blur-xl" />
                  <div
                    className={`relative grid h-36 w-36 place-items-center border border-[var(--gr-border-hi)] bg-[radial-gradient(circle_at_50%_30%,color-mix(in_srgb,var(--gr-cyan-glow)_12%,transparent),transparent_46%),linear-gradient(145deg,var(--gr-bg-2),var(--gr-bg-0))] shadow-[0_0_45px_rgba(0,0,0,0.55)] [clip-path:polygon(0_0,calc(100%_-_16px)_0,100%_16px,100%_100%,0_100%)] sm:h-44 sm:w-44 ${
                      phase === "loading" ? "box-shake" : ""
                    }`}
                  >
                    {phase === "loading" ? (
                      <Loader2 className="h-16 w-16 animate-spin text-[var(--gr-amber)] sm:h-20 sm:w-20" />
                    ) : (
                      <Package className="h-16 w-16 text-[var(--gr-amber)] sm:h-20 sm:w-20" />
                    )}
                  </div>
                </div>

                <div className="mx-auto max-w-md text-center md:mx-0 md:text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--gr-text-dim)]">
                    ELITE CASE OPENING
                  </p>
                  <p className="mt-3 font-display text-[26px] font-extrabold uppercase leading-none tracking-tight text-white sm:text-[38px]">
                    გახსენი პრიზი
                  </p>
                  {phase === "idle" && activeError && (
                    <p className="mt-4 inline-flex bg-red-500/10 px-3 py-2 text-[11px] font-bold text-red-300 ring-1 ring-red-400/25">
                      {errorMessage(activeError)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {(phase === "spinning" || phase === "done") && (
              <div className="relative">
                <div className="mb-4 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.22em] text-[var(--gr-text-dim)]">
                  <Zap className="h-3.5 w-3.5 text-[var(--gr-cyan-glow)]" />
                  <span>
                    {phase === "spinning" ? "LOCKING REWARD" : "REWARD LOCKED"}
                    {summary && ` · ${Math.min(currentSpinIndex + 1, summary.totalOpens)} / ${summary.totalOpens}`}
                  </span>
                </div>

                <div
                  ref={containerRef}
                  className="relative mx-auto max-w-[760px] overflow-hidden border-y border-[var(--gr-border-hi)] bg-black/35 py-4 shadow-[inset_0_0_60px_rgba(0,0,0,0.65)]"
                  style={{ height: CARD_H + 34 }}
                >
                  <div aria-hidden className="crate-scanline pointer-events-none absolute inset-x-0 top-0 z-10 h-full bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.08)_48%,transparent_55%)]" />
                  {phase === "spinning" && (
                    <div aria-hidden className="crate-speed-lines pointer-events-none absolute inset-0 z-10 mix-blend-screen" />
                  )}
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-24 bg-gradient-to-r from-[var(--gr-bg-1)] via-[color-mix(in_srgb,var(--gr-bg-1)_76%,transparent)] to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-24 bg-gradient-to-l from-[var(--gr-bg-1)] via-[color-mix(in_srgb,var(--gr-bg-1)_76%,transparent)] to-transparent" />

                  <div
                    className="crate-selector-pulse pointer-events-none absolute inset-y-2 left-1/2 z-30 -translate-x-1/2"
                    style={{ width: CARD_W + 22 }}
                  >
                    <div className="absolute inset-0 border-x-2 border-amber-300/90 bg-[linear-gradient(90deg,transparent,rgba(245,165,36,0.08),transparent)]" />
                    <div className="absolute -top-1 left-1/2 h-0 w-0 -translate-x-1/2 border-l-[13px] border-r-[13px] border-t-[16px] border-l-transparent border-r-transparent border-t-amber-300" />
                    <div className="absolute -bottom-1 left-1/2 h-0 w-0 -translate-x-1/2 border-b-[16px] border-l-[13px] border-r-[13px] border-b-amber-300 border-l-transparent border-r-transparent" />
                    <div className="absolute inset-y-8 left-3 w-px bg-[color-mix(in_srgb,var(--gr-amber)_60%,transparent)]" />
                    <div className="absolute inset-y-8 right-3 w-px bg-[color-mix(in_srgb,var(--gr-amber)_60%,transparent)]" />
                  </div>

                  <div
                    ref={stripRef}
                    className="absolute left-0 top-4 flex will-change-transform"
                    style={{ gap: CARD_GAP }}
                  >
                    {reel.map((item, i) => (
                      <ReelItemCard key={`${item.id}-${i}`} item={item} isWinner={phase === "done" && i === WINNER_IDX} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {phase === "done" && activeItem && tier && (
              <div className="crate-reveal-card relative mx-auto mt-6 max-w-[720px] text-center">
                <div aria-hidden className={`crate-rarity-burst pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 rounded-full blur-2xl ${TIER_HALO[tier]}`} />
                <div className={`relative overflow-hidden border bg-gradient-to-br p-5 ring-1 ${TIER_CARD[tier]} ${TIER_RING[tier]} [clip-path:polygon(0_0,calc(100%_-_18px)_0,100%_18px,100%_100%,0_100%)]`}>
                  <div aria-hidden className="crate-grid pointer-events-none absolute inset-0 opacity-25" />
                  <div className="relative z-10">
                    <p className={`text-[10px] font-black uppercase tracking-[0.26em] ${TIER_TEXT[tier]}`}>
                      {TIER_LABEL[tier]} DROP
                    </p>

                    {summary && summary.totalOpens > 1 && (
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--gr-text-mute)]">
                        <span>
                          {Math.min(currentSpinIndex + 1, summary.totalOpens)} / {summary.totalOpens}
                        </span>
                        {summary.bonusAwarded > 0 && (
                          <span className="inline-flex items-center gap-1 text-[var(--gr-cyan-glow)]">
                            <Gift className="h-3.5 w-3.5" />
                            +{summary.bonusAwarded} bonus
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mx-auto mt-4 grid h-28 w-28 place-items-center sm:h-36 sm:w-36">
                      {activeItem.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={activeItem.image_url}
                          alt={activeItem.name}
                          className={`max-h-full max-w-full object-contain ${TIER_SHADOW[tier]}`}
                        />
                      ) : (
                        <TierGlyph tier={tier} className={`h-16 w-16 ${TIER_TEXT[tier]} ${TIER_SHADOW[tier]}`} />
                      )}
                    </div>

                    <p className="mt-4 font-display text-[24px] font-extrabold uppercase leading-none tracking-tight text-white sm:text-[34px]">
                      {activeItem.name}
                    </p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--gr-text-mute)]">
                      {TYPE_LABEL[activeItem.item_type] ?? activeItem.item_type}
                    </p>
                  </div>
                </div>

                {bundleCompleted && (
                  <div className="mt-4 overflow-hidden border border-[var(--gr-border)] bg-[color-mix(in_srgb,var(--gr-bg-0)_78%,black)] p-4 text-left ring-1 ring-[color-mix(in_srgb,var(--gr-cyan-glow)_12%,transparent)] [clip-path:polygon(0_0,calc(100%_-_14px)_0,100%_14px,100%_100%,0_100%)]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--gr-text)]">
                        მიღებული პრიზები
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--gr-text-mute)]">
                        {summary.totalOpens} ნივთი
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                      {openedItems.map((item, index) => (
                        <div
                          key={`${item.id}-${index}`}
                          className={`relative overflow-hidden border bg-gradient-to-br p-2 text-center ring-1 ${TIER_CARD[item.tier]} ${TIER_RING[item.tier]} [clip-path:polygon(0_0,calc(100%_-_10px)_0,100%_10px,100%_100%,0_100%)]`}
                        >
                          <div aria-hidden className="crate-grid pointer-events-none absolute inset-0 opacity-20" />
                          <div className="relative z-10">
                            <div className="mx-auto grid h-10 w-10 place-items-center">
                              {item.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className={`max-h-10 max-w-10 object-contain ${TIER_SHADOW[item.tier]}`}
                                />
                              ) : (
                                <TierGlyph tier={item.tier} className={`h-5 w-5 ${TIER_TEXT[item.tier]}`} />
                              )}
                            </div>
                            <p className="mt-2 line-clamp-2 min-h-[28px] text-[9px] font-black uppercase leading-tight tracking-tight text-white">
                              {item.name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative z-10 px-4 pb-5 sm:px-8 sm:pb-7">
            {phase === "idle" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleOpenSingle}
                  className="crate-button-shine h-auto min-h-12 w-full bg-[linear-gradient(135deg,var(--gr-violet-hi)_0%,var(--gr-amber)_100%)] px-3 py-2 text-white ring-1 ring-[var(--gr-border-hi)] shadow-[0_0_26px_rgba(139,92,246,0.26)] transition hover:brightness-110 active:scale-[0.98] [clip-path:polygon(0_0,calc(100%_-_13px)_0,100%_13px,100%_100%,0_100%)]"
                >
                  <span className="block text-[12px] font-black uppercase tracking-[0.18em]">ერთი გახსნა</span>
                  <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">
                    {costAmount} {CURRENCY_LABEL[costCurrency]}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenBundle}
                  className="h-auto min-h-12 w-full bg-[linear-gradient(135deg,color-mix(in_srgb,var(--gr-bg-2)_92%,black)_0%,color-mix(in_srgb,var(--gr-bg-1)_96%,black)_100%)] px-3 py-2 text-white ring-1 ring-[var(--gr-border-hi)] shadow-[0_0_24px_rgba(34,211,238,0.14)] transition hover:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--gr-bg-2)_96%,black)_0%,color-mix(in_srgb,var(--gr-bg-1)_100%,black)_100%)] hover:ring-[color-mix(in_srgb,var(--gr-cyan-glow)_36%,var(--gr-border-hi))] active:scale-[0.98] [clip-path:polygon(0_0,calc(100%_-_13px)_0,100%_13px,100%_100%,0_100%)]"
                >
                  <span className="flex items-center justify-center gap-1 text-[12px] font-black uppercase tracking-[0.18em]">
                    <span>10 გახსნა</span>
                    <span className="text-[var(--gr-cyan-glow)]">+2</span>
                    <Gift className="h-3.5 w-3.5 text-[var(--gr-cyan-glow)]" />
                  </span>
                  <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
                    {bundlePrice} {CURRENCY_LABEL[costCurrency]}
                  </span>
                </button>
              </div>
            )}

            {phase === "loading" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  disabled
                  className="h-12 w-full cursor-not-allowed bg-[linear-gradient(135deg,var(--gr-violet-hi)_0%,var(--gr-amber)_100%)] text-[12px] font-black uppercase tracking-[0.18em] text-white/65 opacity-70 ring-1 ring-[var(--gr-border)] [clip-path:polygon(0_0,calc(100%_-_13px)_0,100%_13px,100%_100%,0_100%)]"
                >
                  იხსნება...
                </button>
                <button
                  disabled
                  className="h-12 w-full cursor-not-allowed bg-[linear-gradient(135deg,color-mix(in_srgb,var(--gr-bg-2)_92%,black)_0%,color-mix(in_srgb,var(--gr-bg-1)_96%,black)_100%)] text-[12px] font-black uppercase tracking-[0.18em] text-white/40 ring-1 ring-[var(--gr-border)] opacity-60 [clip-path:polygon(0_0,calc(100%_-_13px)_0,100%_13px,100%_100%,0_100%)]"
                >
                  10 გახსნა +2
                </button>
              </div>
            )}

            {phase === "spinning" && (
              <div className="flex h-12 items-center justify-center gap-2">
                <span className="h-1.5 w-8 bg-[color-mix(in_srgb,var(--gr-cyan-glow)_40%,transparent)]" />
                <span className="h-1.5 w-8 bg-[color-mix(in_srgb,var(--gr-amber)_70%,transparent)]" />
                <span className="h-1.5 w-8 bg-[color-mix(in_srgb,var(--gr-cyan-glow)_40%,transparent)]" />
              </div>
            )}

            {phase === "done" && (
              <button
                type="button"
                onClick={onClose}
                className="crate-button-shine inline-flex h-12 w-full items-center justify-center gap-2 bg-[linear-gradient(135deg,var(--gr-violet-hi)_0%,var(--gr-amber)_100%)] text-[12px] font-black uppercase tracking-[0.18em] text-white ring-1 ring-[var(--gr-border-hi)] shadow-[0_0_26px_rgba(139,92,246,0.26)] transition hover:brightness-110 active:scale-[0.98] [clip-path:polygon(0_0,calc(100%_-_13px)_0,100%_13px,100%_100%,0_100%)]"
              >
                <CheckCircle2 className="h-4 w-4" />
                {summary && summary.totalOpens > 1 ? `აიღე ${summary.totalOpens} პრიზი` : "აიღე პრიზი"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
