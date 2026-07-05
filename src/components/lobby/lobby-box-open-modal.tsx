"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { CheckCircle2, Crown, Gem, Gift, Loader2, Package, Sparkles, X, Zap } from "lucide-react";
import type { BoxItem, ItemTier, OpenBoxBundleResult, OpenBoxResult, OpenedBoxItem } from "@/types/events";
import styles from "./lobby-box-open-modal.module.css";

const TIER_CARD: Record<ItemTier, string> = {
  common:    "border-slate-500/35 from-slate-700/70 via-slate-900/85 to-[var(--gr-bg-0)]",
  rare:      "border-cyan-300/60 from-cyan-500/70 via-blue-950/85 to-[var(--gr-bg-0)]",
  epic:      "border-red-300/70 from-red-500/75 via-rose-950/85 to-[var(--gr-bg-0)]",
  legendary: "border-amber-300/85 from-amber-400/80 via-red-950/90 to-[var(--gr-bg-0)]",
};

const TIER_TEXT: Record<ItemTier, string> = {
  common:    "text-slate-300",
  rare:      "text-cyan-200",
  epic:      "text-red-200",
  legendary: "text-amber-200",
};

const TIER_RING: Record<ItemTier, string> = {
  common:    "ring-slate-400/25",
  rare:      "ring-cyan-300/45",
  epic:      "ring-red-300/55",
  legendary: "ring-amber-300/70",
};

const TIER_HALO: Record<ItemTier, string> = {
  common:    "bg-slate-400/20",
  rare:      "bg-cyan-300/25",
  epic:      "bg-red-300/30",
  legendary: "bg-amber-300/36",
};

const TIER_SHADOW: Record<ItemTier, string> = {
  common:    "drop-shadow-[0_0_18px_rgba(148,163,184,0.45)]",
  rare:      "drop-shadow-[0_0_24px_rgba(34,211,238,0.65)]",
  epic:      "drop-shadow-[0_0_30px_rgba(248,113,113,0.75)]",
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

const CARD_W = 142;
const CARD_H = 142;
const CARD_GAP = 10;
const CARD_STEP = CARD_W + CARD_GAP;
const WINNER_IDX = 54;
const REEL_TOTAL = 72;
const SPIN_MS = 10000;

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

function RewardNameplate({ name, animated = false }: { name: string; animated?: boolean }) {
  const normalized = name.toLowerCase();
  const isIcefire = normalized.includes("caucasus") || normalized.includes("icefire");

  return (
    <div className={`relative mx-auto mt-4 max-w-[620px] px-3 py-2 ${animated ? styles.crateKineticTitleGlow : ""}`}>
      <div aria-hidden className="absolute inset-x-12 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(125,217,255,0.92),rgba(246,201,95,0.92),transparent)]" />
      <div aria-hidden className="absolute inset-x-12 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(246,201,95,0.86),rgba(125,217,255,0.78),transparent)]" />
      <div aria-hidden className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(246,201,95,0.75)] bg-[rgba(8,13,18,0.96)] shadow-[0_0_16px_rgba(125,217,255,0.5)]" />
      <div
        className="relative rounded-full border border-[rgba(125,217,255,0.45)] bg-[linear-gradient(90deg,rgba(3,7,13,0.88),rgba(9,24,34,0.94)_48%,rgba(3,7,13,0.88))] px-6 py-3 shadow-[inset_0_0_30px_rgba(125,217,255,0.12),0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-md"
      >
        <p className="font-display text-[24px] font-black uppercase leading-none tracking-wider text-white sm:text-[34px]">
          {isIcefire ? (
            <>
              <span className="text-[#f6c95f] drop-shadow-[0_0_10px_rgba(246,201,95,0.38)]">M416 - </span>
              <span className="text-[#c8f3ff] drop-shadow-[0_0_14px_rgba(125,217,255,0.65)]">Caucasus Icefire</span>
            </>
          ) : (
            name
          )}
        </p>
      </div>
      <div aria-hidden className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full border border-[rgba(246,201,95,0.8)] bg-[rgba(8,13,18,0.96)] shadow-[0_0_16px_rgba(125,217,255,0.5)]" />
    </div>
  );
}

type ReelItemCardProps = {
  item: BoxItem;
  isWinner?: boolean;
};

function ReelItemCard({ item, isWinner = false }: ReelItemCardProps) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-[20px] border bg-gradient-to-br p-2 ring-1 transition-all duration-500 ease-out ${TIER_CARD[item.tier]} ${TIER_RING[item.tier]} ${
        isWinner 
          ? "scale-[1.08] shadow-[0_0_40px_rgba(246,201,95,0.4)] z-10 border-[#f6c95f]/70" 
          : "scale-95 opacity-50 blur-[2px] grayscale-[20%]"
      }`}
      style={{ width: CARD_W, height: CARD_H }}
    >
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
  boxImageUrl?: string | null;
  boxItems: BoxItem[];
  costAmount: number;
  costCurrency: "nc" | "pro";
  onClose: () => void;
  onOpen: () => Promise<OpenBoxResult>;
  onOpenBundle: () => Promise<OpenBoxBundleResult>;
};

export function LobbyBoxOpenModal({
  boxName,
  boxImageUrl,
  boxItems,
  costAmount,
  costCurrency,
  onClose,
  onOpen,
  onOpenBundle,
}: Props) {
  const normalizedBoxName = boxName.trim().toLowerCase();
  const isCaucasusCrate =
    normalizedBoxName.includes("caucasus") ||
    normalizedBoxName.includes("caucasian icefire") ||
    boxName.includes("კავკას");
  const crateKicker = isCaucasusCrate ? "კავკასიური MYTHIC ქრეითი" : "ქართული PRO ქრეითი";
  const spinLabel = isCaucasusCrate ? "ICEFIRE SPIN" : "BORJGALI SPIN";
  const coverMediaUrl = isCaucasusCrate ? "/crates/caucasus-icefire-cover.mp4" : boxImageUrl;
  const coverIsVideo = !!coverMediaUrl && /\.(mp4|webm|ogg)(?:[?#].*)?$/i.test(coverMediaUrl);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<OpenBoxResult | null>(null);
  const [bundleResult, setBundleResult] = useState<OpenBoxBundleResult | null>(null);
  const [openedItems, setOpenedItems] = useState<OpenedBoxItem[]>([]);
  const [currentSpinIndex, setCurrentSpinIndex] = useState(0);
  const [summary, setSummary] = useState<SpinSummary | null>(null);
  const [reel, setReel] = useState<BoxItem[]>([]);
  const [centerIndex, setCenterIndex] = useState<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase !== "spinning" && phase !== "loading") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, phase]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, []);

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

    try {
      const res = await onOpen();
      setResult(res);

      if (!res.success) {
        setPhase("idle");
        return;
      }

      startSpinSequence([res.item], { paidOpens: 1, totalOpens: 1, bonusAwarded: 0 });
    } catch (err) {
      console.error("handleOpenSingle error:", err);
      setResult({ success: false, error: "unknown" });
      setPhase("idle");
    }
  }

  async function handleOpenBundle() {
    if (phase !== "idle") return;
    if (!onOpenBundle) {
      console.warn("onOpenBundle is not provided.");
      return;
    }
    setPhase("loading");
    setResult(null);

    try {
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
    } catch (err) {
      console.error("handleOpenBundle error:", err);
      setBundleResult({ success: false, error: "unknown" });
      setPhase("idle");
    }
  }

  useEffect(() => {
    if (phase !== "spinning") return;

    let startTimer: ReturnType<typeof setTimeout> | undefined;
    let doneTimer: ReturnType<typeof setTimeout> | undefined;
    let rafId: number;

    const animate = () => {
      if (!stripRef.current || !containerRef.current) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      const duration = SPIN_MS;
      const cw = containerRef.current.offsetWidth;
      const centerOffset = (cw - CARD_W) / 2;
      const winnerLeft = WINNER_IDX * CARD_STEP;
      const tx = -(winnerLeft - centerOffset);

      stripRef.current.style.transition = "none";
      stripRef.current.style.transform = "translate3d(0,0,0)";

      startTimer = setTimeout(() => {
        if (!stripRef.current) return;
        stripRef.current.style.transition = `transform ${duration}ms cubic-bezier(0.2, 0, 0.4, 1)`;
        stripRef.current.style.transform = `translate3d(${tx}px,0,0)`;
      }, 40);

      doneTimer = setTimeout(() => setPhase("done"), duration + 120);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      if (startTimer) clearTimeout(startTimer);
      if (doneTimer) clearTimeout(doneTimer);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "spinning") {
      // Not spinning → clear the highlighted center item; the value below is
      // measured from layout each frame via requestAnimationFrame.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCenterIndex(null);
      return;
    }

    let rafId: number;
    let lastIndex = -1;

    const checkCenter = () => {
      if (stripRef.current && containerRef.current) {
        const stripRect = stripRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        
        const scrollX = (containerRect.width / 2) - (stripRect.left - containerRect.left);
        const index = Math.floor(scrollX / CARD_STEP);
        
        if (index !== lastIndex && index >= 0 && index < reel.length) {
          lastIndex = index;
          setCenterIndex(index);
        }
      }
      rafId = requestAnimationFrame(checkCenter);
    };
    
    rafId = requestAnimationFrame(checkCenter);
    return () => cancelAnimationFrame(rafId);
  }, [phase, reel.length]);

  useEffect(() => {
    if (phase !== "done") return;
    if (currentSpinIndex >= openedItems.length - 1) return;

    const pauseMs = 620;
    const nextTimer = setTimeout(() => {
      const nextIndex = currentSpinIndex + 1;
      setCurrentSpinIndex(nextIndex);
      setReel(buildReel(boxItems, asBoxItem(openedItems[nextIndex])));
      setPhase("spinning");
    }, pauseMs);

    return () => clearTimeout(nextTimer);
  }, [boxItems, currentSpinIndex, openedItems, phase]);

  const activeItem = openedItems[currentSpinIndex] ?? (result?.success ? result.item : null);
  const canClose = phase === "idle" || (phase === "done" && currentSpinIndex >= openedItems.length - 1);
  const activeError = result && !result.success ? result.error : bundleResult && !bundleResult.success ? bundleResult.error : null;
  const bundlePrice = costAmount * 10;
  const bundleCompleted = !!summary && summary.totalOpens > 1 && currentSpinIndex >= openedItems.length - 1;
  const featuredPreview = [...boxItems]
    .sort((a, b) => {
      const order: Record<ItemTier, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
      return order[a.tier] - order[b.tier];
    })
    .find((item) => item.image_url) ?? boxItems[0] ?? null;
  const scrollingItem = (phase === "spinning" && centerIndex !== null) ? reel[centerIndex] : null;

  const previewName = phase === "spinning"
    ? (scrollingItem?.item_name ?? boxName)
    : (activeItem ? activeItem.name : (featuredPreview?.item_name ?? boxName));
  const previewImage = phase === "spinning"
    ? (scrollingItem?.image_url ?? boxImageUrl)
    : (activeItem ? activeItem.image_url : (featuredPreview?.image_url ?? boxImageUrl));
  const previewTier = phase === "spinning"
    ? (scrollingItem?.tier ?? "common")
    : (activeItem ? activeItem.tier : (featuredPreview?.tier ?? "legendary"));
  const previewType = phase === "spinning"
    ? (scrollingItem?.item_type ?? "cosmetic")
    : (activeItem ? activeItem.item_type : (featuredPreview?.item_type ?? "weapon_skin"));
  const displayReel = reel.length > 0
    ? reel
    : boxItems.length > 0
      ? Array.from({ length: Math.max(36, boxItems.length * 4) }, (_, index) => boxItems[index % boxItems.length])
      : [];
  const showSpinStage = phase !== "idle";
  const revealMotionActive = phase === "idle" || phase === "spinning";
  const reelMotionActive = phase === "idle" || phase === "loading";
  const coverDropInActive = phase === "loading" || phase === "spinning";
  const coverVideoClassName = [
    `${styles.crateCoverVideo} pointer-events-none h-full w-full origin-center object-cover`,
    isCaucasusCrate ? "scale-[1.14] sm:scale-[1.18]" : "",
    coverDropInActive ? styles.crateCoverDropIn : "",
  ]
    .filter(Boolean)
    .join(" ");
  const reelStyle = {
    gap: CARD_GAP,
    ...(reelMotionActive ? { "--reel-cycle": `${Math.max(boxItems.length, 1) * CARD_STEP}px` } : {}),
  } as CSSProperties;

  return (
    <div className="fixed inset-0 z-[220] grid place-items-center overflow-hidden p-2 sm:p-3">
      <div
        className="fixed inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(143,227,255,0.16),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(227,59,59,0.16),transparent_34%),linear-gradient(180deg,rgba(3,7,13,0.96),rgba(2,4,7,0.96)_58%)] backdrop-blur-lg"
        onClick={canClose ? onClose : undefined}
      />

      <section className="relative z-10 flex w-full max-w-[960px] max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-[32px] border border-[#71d0ff]/30 bg-[linear-gradient(145deg,rgba(5,12,18,0.98),rgba(21,6,14,0.92)_58%,rgba(5,14,22,0.98))] shadow-[0_30px_90px_rgba(0,0,0,0.56)] sm:max-h-[calc(100dvh-1.5rem)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_5%,rgba(143,227,255,0.12),transparent_30%)]" />

        <button
          type="button"
          onClick={onClose}
          disabled={!canClose}
          aria-label="დახურვა"
          className="absolute right-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-full border border-[#71d0ff]/30 bg-black/40 text-[#c8f3ff]/70 backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)] transition hover:border-[#f6c95f]/50 hover:bg-[#f6c95f]/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          <X className="h-4 w-4" />
        </button>

        <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#8fe3ff]/10 bg-black/20 px-6 py-5 sm:px-8 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-5 pr-10 sm:pr-0">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] border border-[#f6c95f]/50 bg-[#f6c95f]/15 font-display text-[26px] font-black text-[#f6c95f] shadow-[inset_0_0_20px_rgba(246,201,95,0.2)]">
              G
            </div>
            <div className="min-w-0">
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[#8fe3ff]">
                {crateKicker}
              </p>
              <h2 className="max-w-[calc(100vw-8.5rem)] font-display text-[22px] font-black uppercase leading-[0.94] text-[#eef9ff] drop-shadow-sm sm:max-w-none sm:text-[46px]">
                {boxName}
              </h2>
            </div>
          </div>

          <div className="mr-10 inline-flex items-center gap-2.5 rounded-full border border-[#e33b3b]/50 bg-[#e33b3b]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-[#eef9ff]/90 shadow-[0_0_20px_rgba(227,59,59,0.2)]">
            <span className={`${styles.crateChipFlicker} h-2.5 w-2.5 rounded-full bg-[#e33b3b] shadow-[0_0_18px_rgba(227,59,59,0.9)]`} />
            {spinLabel}
          </div>
        </header>

        <div className="relative z-10 p-3 sm:p-5">
          <div className={`mb-4 grid gap-4 ${showSpinStage ? "lg:grid-cols-[minmax(260px,0.84fr)_minmax(0,1.08fr)]" : "lg:grid-cols-1"}`}>
            <section className={`relative grid min-h-[240px] place-items-center overflow-hidden ${showSpinStage ? "rounded-[24px] border border-[rgba(255,49,49,0.28)] bg-[linear-gradient(180deg,rgba(8,10,18,0.96),rgba(3,6,12,0.98))] shadow-[0_0_30px_rgba(0,0,0,0.5)] p-4" : "mx-auto w-full border-0 bg-transparent p-0"}`}>
              <div
                className={`relative mx-auto w-full overflow-hidden rounded-[20px] border border-[rgba(255,49,49,0.42)] bg-[linear-gradient(180deg,rgba(7,10,18,0.98),rgba(2,4,9,0.98))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_18px_28px_rgba(0,0,0,0.36)] ${
                  phase === "loading" ? "box-shake" : phase === "idle" ? "" : styles.crateKineticCover
                } ${coverIsVideo ? "aspect-[1600/1080] max-w-none" : "aspect-[4/3] max-w-[430px]"}`}
              >
                <div aria-hidden className="pointer-events-none absolute inset-0 z-10 gr-dot-grid opacity-[0.08]" />
                <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[3px] bg-[linear-gradient(90deg,transparent,rgba(255,49,49,0.22),rgba(255,49,49,0.9),rgba(255,49,49,0.22),transparent)]" />
                <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[3px] bg-[linear-gradient(90deg,transparent,rgba(255,49,49,0.18),rgba(255,122,69,0.82),rgba(255,49,49,0.18),transparent)]" />
                {coverMediaUrl ? (
                  coverIsVideo ? (
                    <video
                      key={coverMediaUrl}
                      src={coverMediaUrl}
                      poster={boxImageUrl ?? undefined}
                      autoPlay
                      playsInline
                      preload="auto"
                      controlsList="nodownload noplaybackrate nofullscreen noremoteplayback"
                      disablePictureInPicture
                      disableRemotePlayback
                      className={coverVideoClassName}
                      onLoadedMetadata={(event) => {
                        event.currentTarget.volume = 1;
                        void event.currentTarget.play().catch(() => undefined);
                      }}
                      onEnded={(event) => {
                        event.currentTarget.pause();
                      }}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverMediaUrl}
                      alt={boxName}
                      className={`h-full w-full object-cover ${coverDropInActive ? styles.crateCoverDropIn : ""}`}
                    />
                  )
                ) : (
                  <div className="grid h-full place-items-center">
                    <Package className="h-16 w-16 text-[#8fe3ff]/55" />
                  </div>
                )}
                <div aria-hidden className="absolute inset-0 border-y border-x-0 border-[rgba(255,255,255,0.08)] shadow-[inset_0_0_42px_rgba(0,0,0,0.5)]" />
                <div aria-hidden className={`${styles.crateKineticScan} pointer-events-none absolute inset-0 z-20`} />
                {phase === "loading" && (
                  <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-sm">
                    <Loader2 className="h-16 w-16 animate-spin text-[#f6c95f]" />
                  </div>
                )}
                <div className="absolute inset-x-4 bottom-4 flex justify-between gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#c6e6f2]/65">
                  <span>{costAmount} {CURRENCY_LABEL[costCurrency]}</span>
                  <span>Legendary Pool</span>
                </div>
              </div>
            </section>

            {showSpinStage && (
              <section className={`relative min-h-[240px] overflow-hidden rounded-[24px] border border-[#71d0ff]/26 bg-[linear-gradient(160deg,rgba(2,6,11,0.98),rgba(8,22,32,0.84))] shadow-[0_0_30px_rgba(0,0,0,0.5)] p-4 sm:p-5 ${revealMotionActive ? styles.crateKineticResult : ""}`}>
                <div aria-hidden className={`${styles.crateKineticAura} pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 rounded-full blur-2xl ${TIER_HALO[previewTier]}`} />
                <p className={`relative z-10 text-center text-[10px] font-black uppercase tracking-[0.26em] ${TIER_TEXT[previewTier]}`}>
                  {TIER_LABEL[previewTier]} · ქართული DROP
                </p>
                {summary && summary.totalOpens > 1 && (
                  <p className="relative z-10 mt-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#c6e6f2]/54">
                    {Math.min(currentSpinIndex + 1, summary.totalOpens)} / {summary.totalOpens}
                    {summary.bonusAwarded > 0 ? ` · +${summary.bonusAwarded} bonus` : ""}
                  </p>
                )}

                <div className="relative z-10 mt-3 grid min-h-[172px] place-items-center">
                  <div aria-hidden className="absolute inset-x-[6%] bottom-6 h-[2px] rounded-full bg-[linear-gradient(90deg,transparent,rgba(143,227,255,0.85),rgba(246,201,95,0.75),transparent)] shadow-[0_0_15px_rgba(246,201,95,0.5)]" />
                  {previewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImage}
                      alt={previewName}
                      className={`max-h-[190px] w-full object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,0.72)] ${
                        revealMotionActive
                          ? `${styles.crateKineticWeaponFloat} ${TIER_SHADOW[previewTier]}`
                          : phase === "loading"
                            ? "opacity-70"
                            : TIER_SHADOW[previewTier]
                      }`}
                    />
                  ) : (
                    <TierGlyph tier={previewTier} className={`h-16 w-16 ${TIER_TEXT[previewTier]} ${TIER_SHADOW[previewTier]}`} />
                  )}
                </div>

                <RewardNameplate name={previewName} animated={revealMotionActive} />
                <p className="relative z-10 mt-3 text-center text-[11px] font-black uppercase tracking-[0.18em] text-[#c6e6f2]/60">
                  {TYPE_LABEL[previewType] ?? previewType}
                </p>
              </section>
            )}
          </div>

          {showSpinStage && (
          <section className="relative overflow-hidden rounded-[28px] border border-[#71d0ff]/28 bg-black/40 py-[22px] shadow-[inset_0_0_52px_rgba(0,0,0,0.6),0_15px_35px_rgba(0,0,0,0.4)] backdrop-blur-md">
            <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-20 w-[150px] bg-[linear-gradient(90deg,rgba(5,12,18,0.98),transparent)]" />
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-20 w-[150px] bg-[linear-gradient(270deg,rgba(5,12,18,0.98),transparent)]" />
            
            {/* Redesigned Selection Pointer */}
            <div
              className="pointer-events-none absolute inset-y-0 left-1/2 z-30 -translate-x-1/2"
              style={{ width: CARD_W + 16 }}
            >
              <div className="absolute top-0 left-1/2 h-[20px] w-[60px] -translate-x-1/2 rounded-b-[12px] border-b border-x border-[#f6c95f] bg-[linear-gradient(180deg,#f6c95f,rgba(246,201,95,0.2))] shadow-[0_5px_20px_rgba(246,201,95,0.6)]" />
              <div className="absolute bottom-0 left-1/2 h-[20px] w-[60px] -translate-x-1/2 rounded-t-[12px] border-t border-x border-[#f6c95f] bg-[linear-gradient(0deg,#f6c95f,rgba(246,201,95,0.2))] shadow-[0_-5px_20px_rgba(246,201,95,0.6)]" />
            </div>

            {/* Removed speed lines */}

            <div
              ref={containerRef}
              className="relative mx-auto"
              style={{ height: CARD_H, maxWidth: 1060 }}
            >
              <div
                ref={stripRef}
                className={`absolute left-0 top-0 flex will-change-transform ${reelMotionActive ? styles.crateKineticReelIdle : ""}`}
                style={reelStyle}
              >
                {displayReel.map((item, i) => (
                  <ReelItemCard key={`${item.id}-${i}`} item={item} isWinner={phase === "done" && i === WINNER_IDX} />
                ))}
              </div>
            </div>
          </section>
          )}

          {activeError && phase === "idle" && (
            <p className="mt-4 inline-flex border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11px] font-bold text-red-300">
              {errorMessage(activeError)}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2">
            {phase === "idle" && (
              <>
                <button
                  type="button"
                  onClick={handleOpenSingle}
                  className="group relative flex h-[60px] items-center justify-center gap-2 rounded-full border border-[#f6c95f]/50 bg-[#0a0714] overflow-hidden text-[13px] font-black uppercase tracking-[0.18em] text-[#f6c95f] shadow-[0_10px_30px_rgba(246,201,95,0.15)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(246,201,95,0.15),transparent_60%)] group-hover:opacity-100 opacity-0 transition-opacity duration-300" />
                  <span className="relative z-10 drop-shadow-[0_0_10px_rgba(246,201,95,0.4)]">ერთი გახსნა · {costAmount} {CURRENCY_LABEL[costCurrency]}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenBundle}
                  className="group relative flex h-[60px] flex-col items-center justify-center rounded-full border border-[#8fe3ff]/50 bg-[#0a0714] overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_30px_rgba(143,227,255,0.15)]"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(143,227,255,0.15),transparent_60%)] group-hover:opacity-100 opacity-0 transition-opacity duration-300" />
                  <span className="relative z-10 flex items-center justify-center gap-1.5 text-[13px] font-black uppercase tracking-[0.18em] text-[#c8f3ff] drop-shadow-[0_0_10px_rgba(143,227,255,0.4)]">
                    10 გახსნა +2 <Gift className="h-4 w-4 text-[#8fe3ff]" />
                  </span>
                  <span className="relative z-10 mt-0.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8fe3ff]/70">
                    {bundlePrice} {CURRENCY_LABEL[costCurrency]}
                  </span>
                </button>
              </>
            )}

            {phase === "loading" && (
              <>
                <button disabled className="h-[60px] cursor-not-allowed rounded-full border border-[#f6c95f]/20 bg-[#0a0714] text-[13px] font-black uppercase tracking-[0.18em] text-[#f6c95f]/40">
                  იხსნება...
                </button>
                <button disabled className="h-[60px] cursor-not-allowed rounded-full border border-[#8fe3ff]/20 bg-[#0a0714] text-[13px] font-black uppercase tracking-[0.18em] text-[#c8f3ff]/40">
                  10 გახსნა +2 bonus
                </button>
              </>
            )}

            {phase === "spinning" && (
              <div className="col-span-full flex h-[60px] items-center justify-center gap-3 rounded-full border border-white/5 bg-black/40 backdrop-blur-md text-[13px] font-black uppercase tracking-[0.22em] text-[#c6e6f2] shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                <Zap className="h-5 w-5 animate-pulse text-[#f6c95f] drop-shadow-[0_0_10px_rgba(246,201,95,0.6)]" />
                <span className="animate-pulse">პრიზი ირჩევა...</span>
              </div>
            )}

            {phase === "done" && (
              <button
                type="button"
                onClick={onClose}
                className="group relative col-span-full inline-flex h-[60px] items-center justify-center gap-3 overflow-hidden rounded-full border border-[#f6c95f]/50 bg-[#0a0714] text-[15px] font-black uppercase tracking-[0.18em] text-[#f6c95f] shadow-[0_0_40px_rgba(246,201,95,0.2)] transition-all hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(246,201,95,0.4)] active:scale-[0.98]"
              >
                <div className="absolute inset-0 animate-pulse bg-[radial-gradient(ellipse_at_center,rgba(246,201,95,0.2),transparent_70%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(246,201,95,0.1),transparent)] group-hover:animate-shimmer" />
                <CheckCircle2 className="relative z-10 h-5 w-5 drop-shadow-[0_0_10px_rgba(246,201,95,0.6)]" />
                <span className="relative z-10 drop-shadow-[0_0_10px_rgba(246,201,95,0.6)]">{summary && summary.totalOpens > 1 ? `აიღე ${summary.totalOpens} პრიზი` : "აიღე პრიზი"}</span>
              </button>
            )}
          </div>

          {bundleCompleted && (
            <div className="mt-6 overflow-hidden rounded-[24px] border border-[#71d0ff]/24 bg-[rgba(5,12,18,0.6)] p-5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#eef9ff] drop-shadow-sm">მიღებული პრიზები</p>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#c6e6f2]/60">{summary.totalOpens} ნივთი</p>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {openedItems.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className={`relative overflow-hidden rounded-[16px] border bg-gradient-to-br p-2.5 text-center ring-1 ${TIER_CARD[item.tier]} ${TIER_RING[item.tier]} shadow-[0_5px_15px_rgba(0,0,0,0.3)] transition-all hover:scale-105 hover:shadow-[0_8px_20px_rgba(0,0,0,0.5)]`}
                  >
                    <div className="relative z-10">
                      <div className="mx-auto grid h-10 w-10 place-items-center">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt={item.name} className={`max-h-10 max-w-10 object-contain ${TIER_SHADOW[item.tier]}`} />
                        ) : (
                          <TierGlyph tier={item.tier} className={`h-5 w-5 ${TIER_TEXT[item.tier]}`} />
                        )}
                      </div>
                      <p className="mt-2 line-clamp-2 min-h-[28px] text-[9px] font-black uppercase leading-tight tracking-tight text-white">{item.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
