"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, X, UserCog, Gamepad2, Users, UserPlus, Bell, Gift, Target, ArrowRight, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { OnboardingSpotlight, type SpotTarget } from "@/components/onboarding/onboarding-spotlight";
import { isPushSupported, subscribeToPush } from "@/lib/push-subscribe";
import { claimDailyBonus } from "@/lib/wallet/actions";

type Props = {
  // Server-computed, per-user completion signals.
  hasProfile: boolean;
  hasGames: boolean;
  hasFollows: boolean;
  hasPush: boolean;
  hasClaimedDaily: boolean;
  // Admin-only: shows a "ჩვენება თავიდან" control to re-preview the
  // first-run flow without touching real per-user localStorage state.
  isAdmin?: boolean;
};

const DISMISS_KEY = "pg_onboarding_dismissed";
const VISITED_KEY = "pg_onboarding_visited";
const WELCOMED_KEY = "pg_onboarding_welcomed";
const LEO_IMG = "/characters/gameroom-vanguard-guide.webp";

type VisitKey = "lfg";
type ActionKey = "push" | "daily";

// Where each action lives, desktop-first with a mobile fallback (the "მეტი"
// bottom-sheet button). The spotlight picks whichever target is visible.
const SETTINGS_SPOT: SpotTarget[] = [
  { sel: "settings-desktop", label: "დააჭირე ავატარს → პარამეტრები" },
  { sel: "settings-mobile", label: "გახსენი მეტი, აირჩიე პარამეტრები" },
  { sel: "more-mobile", label: "გახსენი მეტი, აირჩიე პარამეტრები" },
];

/**
 * First-run onboarding hosted by the Vanguard Leo guide. Two surfaces:
 *  - a one-time welcome modal (first visit only),
 *  - a persistent home-feed checklist that tracks progress.
 * Steps mix three kinds: server-verified (profile / games / follow — real DB
 * state), inline-action (push / daily reward — completed right in the card), and
 * visit-tracked (LFG — marked done on navigation). Server steps carry a
 * graphical "სად?" spotlight that highlights the real UI element where the
 * action lives — teaching the navigation, not just deep-linking.
 */
export function OnboardingChecklist({ hasProfile, hasGames, hasFollows, hasPush, hasClaimedDaily, isAdmin }: Props) {
  const [mounted, setMounted] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [visited, setVisited] = useState<Record<VisitKey, boolean>>({ lfg: false });
  const [showModal, setShowModal] = useState(false);
  const [spotlight, setSpotlight] = useState<SpotTarget[] | null>(null);
  // Inline-action completion (push / daily) — server props won't refresh without
  // a reload, so a successful action marks the step done locally.
  const [actionDone, setActionDone] = useState<Record<ActionKey, boolean>>({ push: false, daily: false });
  const [busy, setBusy] = useState<Record<ActionKey, boolean>>({ push: false, daily: false });
  // Admin-only preview override: server-verified steps are real per-user DB
  // state, so a plain localStorage reset can't "undo" them — this forces the
  // checklist to render as if nothing were done yet.
  const [previewFresh, setPreviewFresh] = useState(false);

  const closeModal = useCallback(() => {
    setShowModal(false);
    try { localStorage.setItem(WELCOMED_KEY, "1"); } catch {}
  }, []);

  const markVisited = (key: VisitKey) => {
    setVisited((prev) => {
      const next = { ...prev, [key]: true };
      try { localStorage.setItem(VISITED_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // First-run state is client-only (localStorage + browser push support), so it
  // must be read after mount to avoid an SSR/hydration mismatch — the component
  // renders nothing until then. Syncing that external state in is a legitimate
  // effect use that the generic set-state-in-effect heuristic flags anyway.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setMounted(true);
    setPushSupported(isPushSupported());
    try {
      const isDismissed = localStorage.getItem(DISMISS_KEY) === "1";
      setDismissed(isDismissed);
      const raw = localStorage.getItem(VISITED_KEY);
      if (raw) setVisited((v) => ({ ...v, ...JSON.parse(raw) }));
      if (!isDismissed && localStorage.getItem(WELCOMED_KEY) !== "1") setShowModal(true);
    } catch {}
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!showModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [showModal, closeModal]);

  const enablePush = async () => {
    setBusy((b) => ({ ...b, push: true }));
    try {
      const result = await subscribeToPush();
      if (result === "ok") {
        setActionDone((d) => ({ ...d, push: true }));
        toast.success("შეტყობინებები ჩაირთო ✅");
      } else if (result === "denied") {
        toast.error("Notification permission გათიშულია ბრაუზერში.");
      } else {
        toast.error("ვერ ჩაირთო");
      }
    } finally {
      setBusy((b) => ({ ...b, push: false }));
    }
  };

  const claimDaily = async () => {
    setBusy((b) => ({ ...b, daily: true }));
    try {
      const result = await claimDailyBonus();
      if (result.success) {
        setActionDone((d) => ({ ...d, daily: true }));
        toast.success(`+${result.amount} NC 🎁`);
      } else if (result.error === "already_claimed") {
        setActionDone((d) => ({ ...d, daily: true }));
      } else {
        toast.error("ვერ მოხერხდა — სცადე თავიდან.");
      }
    } finally {
      setBusy((b) => ({ ...b, daily: false }));
    }
  };

  // Admin-only: wipe local first-run state and re-show the welcome modal +
  // progress card exactly as a brand-new user would see them.
  const previewAgain = () => {
    try {
      localStorage.removeItem(DISMISS_KEY);
      localStorage.removeItem(VISITED_KEY);
      localStorage.removeItem(WELCOMED_KEY);
    } catch {}
    setDismissed(false);
    setVisited({ lfg: false });
    setActionDone({ push: false, daily: false });
    setPreviewFresh(true);
    setShowModal(true);
  };

  const srv = (done: boolean) => (previewFresh ? false : done);

  type Step = {
    key: string;
    done: boolean;
    icon: typeof UserCog;
    label: string;
    spot?: SpotTarget[];
    href?: string;
    cta?: string;
    onClick?: () => void;
    action?: () => Promise<void>;
    actionCta?: string;
    actionBusy?: boolean;
  };

  const steps: Step[] = [
    { key: "profile", done: srv(hasProfile), icon: UserCog, label: "დააყენე პარამეტრები და შეავსე პროფილი", spot: SETTINGS_SPOT, href: "/settings", cta: "შევსება" },
    { key: "games", done: srv(hasGames), icon: Gamepad2, label: "აირჩიე შენი თამაშები", spot: [{ sel: "nav-games", label: "თამაშები — აქ" }, { sel: "games-mobile", label: "გახსენი მეტი, აირჩიე თამაშები" }, { sel: "more-mobile", label: "გახსენი მეტი, აირჩიე თამაშები" }], href: "/games", cta: "არჩევა" },
    { key: "follow", done: srv(hasFollows), icon: UserPlus, label: "გაჰყევი 3 მოთამაშეს", spot: [{ sel: "nav-search", label: "ძებნა — იპოვე მოთამაშეები" }, { sel: "nav-search-mobile", label: "ძებნა — იპოვე მოთამაშეები" }], href: "/search", cta: "პოვნა" },
    { key: "lfg", done: visited.lfg, icon: Users, label: "იპოვე გუნდი — LFG", spot: [{ sel: "nav-lfg", label: "ლოკალი (LFG) — აქ" }, { sel: "lfg-mobile", label: "გახსენი მეტი, აირჩიე ლოკალი" }, { sel: "more-mobile", label: "გახსენი მეტი, აირჩიე ლოკალი" }], href: "/lfg", cta: "ნახვა", onClick: () => markVisited("lfg") },
    ...(pushSupported ? [{ key: "push", done: srv(hasPush) || actionDone.push, icon: Bell, label: "ჩართე შეტყობინებები", action: enablePush, actionCta: "ჩართვა", actionBusy: busy.push } as Step] : []),
    { key: "daily", done: srv(hasClaimedDaily) || actionDone.daily, icon: Gift, label: "აიღე დღიური ჯილდო", action: claimDaily, actionCta: "მიღება", actionBusy: busy.daily },
  ];

  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
  };

  if (!mounted) return null;

  return (
    <>
      {isAdmin && (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={previewAgain}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-white/50 transition-colors hover:border-[var(--gr-violet-hi)]/40 hover:text-[var(--gr-violet-hi)]"
          >
            <RotateCcw className="h-3.5 w-3.5" /> ჩვენება თავიდან (ადმინი)
          </button>
        </div>
      )}

      {spotlight && <OnboardingSpotlight candidates={spotlight} onClose={() => setSpotlight(null)} />}

      {/* One-time welcome modal (portalled so it escapes the feed's stacking
          context and covers the fixed header/nav) */}
      {showModal && typeof document !== "undefined" && createPortal(
        <div role="dialog" aria-modal="true" aria-label="მოგესალმებით PlayGame-ზე" className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button type="button" aria-label="დახურვა" onClick={closeModal} className="absolute inset-0 border-0 bg-black/70 p-0 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-[var(--gr-border-hi)] bg-[var(--gr-bg-elev-1)] p-6 text-center shadow-2xl sm:p-8">
            <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-56 w-56 -translate-x-1/2 rounded-full bg-gradient-to-b from-[var(--gr-violet)]/30 to-transparent blur-3xl" />
            <button type="button" onClick={closeModal} aria-label="დახურვა" className="absolute right-4 top-4 rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white/80">
              <X className="h-4.5 w-4.5" />
            </button>
            <div className="mx-auto mb-4 h-28 w-28 overflow-hidden rounded-3xl bg-[var(--gr-bg-elev-2)] ring-1 ring-[var(--gr-border-hi)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LEO_IMG} alt="ვანგუარდი ლეო" className="h-full w-full object-cover object-top" draggable={false} />
            </div>
            <h2 className="font-display text-[22px] font-black uppercase tracking-[0.04em] text-white">
              მოგესალმებით PlayGame-ზე! 👋
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-[14px] leading-relaxed text-white/60">
              მე <span className="font-bold text-[var(--gr-violet-hi)]">ვანგუარდი ლეო</span> ვარ, შენი გიდი. მოდი, რამდენიმე ნაბიჯში მოვაწყოთ შენი პროფილი და გაჩვენო სად რა არის.
            </p>
            <button type="button" onClick={closeModal} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--gr-violet-hi)] px-8 py-3 font-display text-[13px] font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(139,92,246,0.35)] transition-all hover:brightness-110">
              დავიწყოთ <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Persistent progress card */}
      {!dismissed && !allDone && (
        <div className="relative isolate overflow-hidden rounded-2xl border border-[var(--gr-border-hi)] bg-[var(--gr-bg-elev-1)] p-5 sm:p-6">
          <div aria-hidden className="pointer-events-none absolute -top-20 left-8 -z-10 h-48 w-48 rounded-full bg-gradient-to-b from-[var(--gr-violet)]/25 to-transparent blur-3xl" />

          <div className="flex items-start gap-3 sm:gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[var(--gr-bg-elev-2)] ring-1 ring-[var(--gr-border-hi)] sm:h-20 sm:w-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LEO_IMG} alt="ვანგუარდი ლეო" className="h-full w-full object-cover object-top" draggable={false} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-[16px] font-black uppercase tracking-[0.04em] text-white">
                  მოგესალმებით 👋
                </h3>
                <button type="button" onClick={dismiss} aria-label="დახურვა" className="shrink-0 rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white/80">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/60">
                მე <span className="font-bold text-[var(--gr-violet-hi)]">ვანგუარდი ლეო</span> ვარ — დააჭირე <span className="font-bold text-white/80">„სად?&rdquo;</span>-ს და გაჩვენებ, სად რა არის.
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--gr-violet),var(--gr-magenta))] transition-[width] duration-500" style={{ width: `${(completed / steps.length) * 100}%` }} />
            </div>
            <span className="text-[11px] font-black tabular-nums text-white/60">{completed}/{steps.length}</span>
          </div>

          {/* Steps */}
          <ul className="mt-4 space-y-2">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <li key={s.key} className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors ${
                      s.done
                        ? "bg-[var(--gr-lime)]/15 text-[var(--gr-lime)] ring-1 ring-[var(--gr-lime)]/30"
                        : "bg-white/5 text-white/50 ring-1 ring-white/10"
                    }`}
                  >
                    {s.done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className={`min-w-0 flex-1 text-[13.5px] font-medium ${s.done ? "text-white/45 line-through" : "text-white/90"}`}>
                    {s.label}
                  </span>
                  {!s.done && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      {s.action ? (
                        <button
                          type="button"
                          onClick={s.action}
                          disabled={s.actionBusy}
                          className="flex items-center gap-1.5 rounded-lg border border-[var(--gr-violet-hi)]/40 bg-[var(--gr-violet)]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--gr-violet-hi)] transition-colors hover:bg-[var(--gr-violet)]/20 disabled:opacity-50"
                        >
                          {s.actionBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          {s.actionCta}
                        </button>
                      ) : (
                        <>
                          {s.spot && (
                            <button
                              type="button"
                              onClick={() => setSpotlight(s.spot!)}
                              aria-label="სად ვიპოვო"
                              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-white/60 transition-colors hover:border-[var(--gr-violet-hi)]/40 hover:text-[var(--gr-violet-hi)]"
                            >
                              <Target className="h-3.5 w-3.5" /> სად?
                            </button>
                          )}
                          {s.href && (
                            <Link
                              href={s.href}
                              onClick={s.onClick}
                              className="rounded-lg border border-[var(--gr-violet-hi)]/40 bg-[var(--gr-violet)]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--gr-violet-hi)] transition-colors hover:bg-[var(--gr-violet)]/20"
                            >
                              {s.cta}
                            </Link>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
