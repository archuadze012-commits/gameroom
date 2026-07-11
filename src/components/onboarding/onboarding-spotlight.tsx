"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronUp, ChevronDown } from "lucide-react";

export type SpotTarget = { sel: string; label: string };

/**
 * Graphical coach-mark. Given ordered candidate targets (identified by
 * `data-tour="..."` attributes on real UI elements), it spotlights the first
 * one currently visible — dimming the rest of the screen, ringing the target,
 * and labelling it. Candidates are ordered desktop-first with a mobile fallback
 * (e.g. the "მეტი" button), so the same step resolves correctly per breakpoint.
 *
 * Rendered through a portal to document.body: the onboarding card lives inside
 * a stacking context (the feed section's `z-10`), so an in-tree overlay would
 * be trapped below the fixed header/nav and fail to dim them.
 */
export function OnboardingSpotlight({
  candidates,
  onClose,
}: {
  candidates: SpotTarget[];
  onClose: () => void;
}) {
  const [state, setState] = useState<{ rect: DOMRect; label: string } | null>(null);
  // Tracks which element we've already auto-scrolled to, so scroll-triggered
  // re-measures don't re-trigger scrollIntoView and fight the user.
  const scrolledElRef = useRef<Element | null>(null);

  useEffect(() => {
    const find = (): { el: HTMLElement; rect: DOMRect; label: string } | null => {
      for (const c of candidates) {
        const el = document.querySelector<HTMLElement>(`[data-tour="${c.sel}"]`);
        if (el) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) return { el, rect: r, label: c.label };
        }
      }
      return null;
    };
    const update = () => {
      const found = find();
      if (!found) { setState(null); return; }
      setState({ rect: found.rect, label: found.label });
      // First time we resolve this element (candidates changed, or it just
      // mounted), bring it into view. Guards against re-firing on every
      // scroll-driven re-measure.
      if (scrolledElRef.current !== found.el) {
        scrolledElRef.current = found.el;
        found.el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    scrolledElRef.current = null;
    update();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [candidates, onClose]);

  if (typeof document === "undefined") return null;

  // Target not visible anywhere (e.g. hidden on this breakpoint) → centered note.
  if (!state) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <button type="button" aria-label="დახურვა" onClick={onClose} className="absolute inset-0 border-0 bg-black/75 p-0" />
        <div className="relative z-10 max-w-xs rounded-2xl border border-[var(--gr-border-hi)] bg-[var(--gr-bg-elev-1)] p-5 text-center">
          <p className="text-[13.5px] text-white/80">{candidates[0]?.label}</p>
          <button type="button" onClick={onClose} className="mt-4 rounded-full bg-[var(--gr-violet-hi)] px-6 py-2 text-[12px] font-black uppercase tracking-widest text-white">
            გასაგებია
          </button>
        </div>
      </div>,
      document.body
    );
  }

  const { rect, label } = state;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const pad = 8;

  // Target is fully outside the viewport (auto-scroll is mid-flight, or the
  // browser can't scroll it fully into view). Drawing a "hole" at an
  // off-screen position would just paint solid black with nothing visible —
  // show a directional cue instead.
  const isAbove = rect.bottom + pad <= 0;
  const isBelow = rect.top - pad >= H;
  if (isAbove || isBelow) {
    return createPortal(
      <div className="fixed inset-0 z-[100]">
        <button type="button" aria-label="დახურვა" onClick={onClose} className="absolute inset-0 border-0 bg-black/75 p-0" />
        <div
          className={`pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 ${
            isAbove ? "top-6 animate-bounce" : "bottom-6 animate-bounce"
          }`}
        >
          {isAbove && <ChevronUp className="h-7 w-7 text-[var(--gr-violet-hi)]" />}
          <div className="pointer-events-auto rounded-full border border-[var(--gr-violet-hi)]/60 bg-[var(--gr-bg-elev-1)] px-4 py-2 shadow-2xl">
            <span className="text-[13px] font-bold text-white">
              {isAbove ? "ასქროლე ზემოთ" : "ჩაასქროლე ქვემოთ"} — {label}
            </span>
          </div>
          {isBelow && <ChevronDown className="h-7 w-7 text-[var(--gr-violet-hi)]" />}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="დახურვა"
          className="absolute right-4 top-4 z-10 rounded-lg bg-white/5 p-2 text-white/60 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>,
      document.body
    );
  }

  const hTop = Math.max(0, rect.top - pad);
  const hLeft = Math.max(0, rect.left - pad);
  const hRight = Math.min(W, rect.right + pad);
  const hBottom = Math.min(H, rect.bottom + pad);
  const hW = hRight - hLeft;
  const hH = hBottom - hTop;
  const centerX = Math.min(Math.max(hLeft + hW / 2, 130), W - 130);
  const labelBelow = hBottom + 120 < H;
  const dark = "fixed border-0 p-0 bg-black/75";

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Four dark rectangles frame the target, leaving it uncovered (still
          clickable/interactive); clicking any dark area closes. */}
      <button aria-label="დახურვა" onClick={onClose} className={dark} style={{ left: 0, top: 0, width: W, height: hTop }} />
      <button aria-label="დახურვა" onClick={onClose} className={dark} style={{ left: 0, top: hBottom, width: W, height: H - hBottom }} />
      <button aria-label="დახურვა" onClick={onClose} className={dark} style={{ left: 0, top: hTop, width: hLeft, height: hH }} />
      <button aria-label="დახურვა" onClick={onClose} className={dark} style={{ left: hRight, top: hTop, width: W - hRight, height: hH }} />

      {/* Glowing ring around the target */}
      <div
        aria-hidden
        className="pointer-events-none fixed rounded-xl animate-pulse"
        style={{
          left: hLeft,
          top: hTop,
          width: hW,
          height: hH,
          boxShadow: "0 0 0 3px var(--gr-violet-hi), 0 0 0 7px rgba(139,92,246,0.4), 0 0 34px 8px rgba(139,92,246,0.65)",
        }}
      />

      {/* Label + caret pointing at the target */}
      <div
        className="fixed z-10 w-max max-w-[82vw] -translate-x-1/2"
        style={{ left: centerX, ...(labelBelow ? { top: hBottom + 16 } : { bottom: H - hTop + 16 }) }}
      >
        <div className="relative rounded-xl border border-[var(--gr-violet-hi)]/60 bg-[var(--gr-bg-elev-1)] px-4 py-2.5 shadow-2xl">
          {/* caret */}
          <span
            aria-hidden
            className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-[var(--gr-violet-hi)]/60 bg-[var(--gr-bg-elev-1)] ${
              labelBelow ? "-top-1.5 border-l border-t" : "-bottom-1.5 border-b border-r"
            }`}
          />
          <div className="relative flex items-center gap-2">
            <span className="text-[13px] font-bold text-white">{label}</span>
            <button type="button" onClick={onClose} aria-label="დახურვა" className="ml-1 rounded p-1 text-white/50 transition-colors hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
