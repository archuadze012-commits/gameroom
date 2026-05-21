"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "violet" | "amber" | "magenta" | "cyan";

const toneRing: Record<Tone, string> = {
  violet:  "before:bg-[var(--gr-violet)]",
  amber:   "before:bg-[var(--gr-amber)]",
  magenta: "before:bg-[var(--gr-magenta)]",
  cyan:    "before:bg-[var(--gr-cyan-glow)]",
};

type Props = {
  label: React.ReactNode;
  value: number | string;
  /** When `value` is numeric, animate from 0 → value on viewport enter. */
  countUp?: boolean;
  /** Suffix to append to the count-up value (e.g. "K", "+"). */
  suffix?: React.ReactNode;
  tone?: Tone;
  className?: string;
};

export function StatTile({
  label,
  value,
  countUp = true,
  suffix,
  tone = "violet",
  className,
}: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const target = typeof value === "number" ? value : Number.NaN;
  const [display, setDisplay] = React.useState<number | string>(
    countUp && Number.isFinite(target) ? 0 : value
  );

  React.useEffect(() => {
    if (!countUp || !Number.isFinite(target)) {
      setDisplay(value);
      return;
    }
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(target);
      return;
    }
    let started = false;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || started) return;
        started = true;
        const duration = 900;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(Math.round(target * eased));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.disconnect();
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [countUp, target, value]);

  const clip = "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)";

  return (
    <div
      ref={ref}
      className={cn(
        "relative isolate flex flex-col gap-1 px-4 py-3 text-left",
        "bg-[var(--gr-bg-1)] text-[var(--gr-text)]",
        // top 2px accent line via ::before
        "before:absolute before:left-0 before:right-0 before:top-0 before:h-[2px] before:content-['']",
        toneRing[tone],
        className
      )}
      style={{ clipPath: clip }}
    >
      {/* amber corner notch */}
      <span
        aria-hidden
        className="absolute right-0 top-0 h-2.5 w-2.5 bg-[var(--gr-amber)]"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
      />
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-text-mute)]">
        {label}
      </span>
      <span className="font-display text-[28px] font-extrabold leading-none tabular-nums">
        {display}
        {suffix && <span className="ml-0.5 text-[18px] text-[var(--gr-text-mute)]">{suffix}</span>}
      </span>
    </div>
  );
}
