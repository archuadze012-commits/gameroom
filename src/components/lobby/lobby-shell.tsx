"use client";

import { useEffect, useRef, useState } from "react";
import { SITE_BRAND_WORDMARK_STYLE } from "@/components/layout/site-brand";

type Props = {
  children: React.ReactNode;
  /** Image URL to preload before reveal. */
  imageUrl: string;
  /** Minimum preloader duration in ms — floor for the dramatic build-up. */
  minDurationMs?: number;
  /** Eyebrow text shown above the logo. */
  eyebrow?: string;
};

/**
 * Casino-slot-style cinematic shell:
 *   1. Full-screen preloader (logo + progress bar) while the lobby image preloads.
 *   2. Once preload + min-time are both ready: preloader fades, content scales + fades in,
 *      a single violet burst plays.
 *   3. Preloader unmounts after the transition.
 */
export function LobbyShell({
  children,
  imageUrl,
  minDurationMs = 2200,
  eyebrow = "ლობის გახსნა",
}: Props) {
  const [progress, setProgress] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const [minTimeReady, setMinTimeReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const startedAt = useRef<number>(0);

  // Lazy-init start time so it lines up with first paint, not module evaluation.
  useEffect(() => {
    startedAt.current = performance.now();
  }, []);

  // Real preload — block reveal until the image is actually decoded.
  useEffect(() => {
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => { if (!cancelled) setImageReady(true); };
    img.onerror = () => { if (!cancelled) setImageReady(true); };
    img.src = imageUrl;
    return () => { cancelled = true; };
  }, [imageUrl]);

  // Animate progress 0 → 100 across minDurationMs. When it hits 100, mark min-time ready.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const start = startedAt.current || performance.now();
      const elapsed = performance.now() - start;
      const pct = Math.min(100, (elapsed / minDurationMs) * 100);
      setProgress(pct);
      if (pct >= 100) {
        setMinTimeReady(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [minDurationMs]);

  const ready = imageReady && minTimeReady;

  // Schedule full unmount after fade-out has time to play.
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => setHidden(true), 800);
    return () => window.clearTimeout(id);
  }, [ready]);

  return (
    <>
      {/* Page content — fades + scales in once ready. Blocks pointer events until ready. */}
      <div
        className={`absolute inset-0 transition-all duration-[700ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
          ready
            ? "opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 translate-y-3 scale-[0.985]"
        }`}
      >
        {children}
      </div>

      {/* Preloader overlay — scoped to the parent box (the lobby card). */}
      {!hidden && (
        <div
          role="status"
          aria-live="polite"
          aria-label="იტვირთება ლობი"
          className={`absolute inset-0 z-[6] grid place-items-center overflow-hidden bg-[#08060F] transition-opacity duration-700 ease-out ${
            ready ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          {/* faint violet/magenta light leaks */}
          <span aria-hidden className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-[var(--gr-violet)]/30 blur-[120px]" />
          <span aria-hidden className="pointer-events-none absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-[var(--gr-magenta)]/25 blur-[120px]" />

          {/* dot grid */}
          <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-40" />

          {/* scanlines */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, transparent 0 2px, rgba(255,255,255,0.6) 2px 3px)",
            }}
          />

          {/* center stack */}
          <div className="relative flex flex-col items-center gap-4 px-4 sm:gap-5">
            {/* eyebrow */}
            <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--gr-amber)] sm:text-[10.5px] sm:tracking-[0.32em]">
              {eyebrow}
            </span>

            {/* logo */}
            <h1
              className="font-display text-[26px] font-extrabold uppercase leading-none tracking-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] sm:text-[40px]"
            >
              <span style={SITE_BRAND_WORDMARK_STYLE}>Gameroom</span>
            </h1>

            {/* progress bar */}
            <div
              className="relative h-[5px] w-44 overflow-hidden bg-[var(--gr-bg-2)] sm:w-72"
              style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 4px) 100%, 4px 100%)" }}
            >
              <div
                className="h-full bg-[var(--gr-grad-violet)] shadow-[0_0_10px_rgba(139,92,246,0.7)]"
                style={{ width: `${progress}%`, transition: "width 80ms linear" }}
              />
              <div
                aria-hidden
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent motion-safe:animate-[lobby-shine_1.8s_linear_infinite]"
              />
            </div>

            {/* status row */}
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] sm:text-[11px] sm:tracking-[0.2em]">
              <span className="text-[var(--gr-text-mute)]">იტვირთება</span>
              <span className="font-display text-[14px] font-extrabold tabular-nums text-white sm:text-[16px]">
                {Math.round(progress)}%
              </span>
            </div>
          </div>

          {/* one-shot violet burst on reveal */}
          {ready && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 motion-safe:animate-[lobby-burst_700ms_ease-out_forwards]"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(192,38,211,0.55) 0%, rgba(139,92,246,0.25) 30%, transparent 65%)",
              }}
            />
          )}
        </div>
      )}
    </>
  );
}
