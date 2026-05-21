import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "violet" | "amber" | "magenta" | "cyan";

const colors: Record<Tone, { from: string; via: string }> = {
  violet:  { from: "rgba(139,92,246,0)",  via: "rgba(139,92,246,0.45)" },
  amber:   { from: "rgba(245,165,36,0)",  via: "rgba(245,165,36,0.45)" },
  magenta: { from: "rgba(192,38,211,0)",  via: "rgba(192,38,211,0.45)" },
  cyan:    { from: "rgba(34,211,238,0)",  via: "rgba(34,211,238,0.40)" },
};

type Props = {
  tone?: Tone;
  className?: string;
  /** Width of the pillar in px. */
  width?: number;
  /** Animate slow vertical sweep. */
  animated?: boolean;
};

export function LightPillar({ tone = "violet", className, width = 2, animated = true }: Props) {
  const c = colors[tone];
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-0 -z-0",
        animated && "motion-safe:animate-[gr-pillar_8s_ease-in-out_infinite]",
        className
      )}
      style={{
        width,
        background: `linear-gradient(180deg, ${c.from} 0%, ${c.via} 35%, ${c.via} 65%, ${c.from} 100%)`,
        boxShadow: `0 0 24px ${c.via}, 0 0 60px ${c.from}`,
      }}
    />
  );
}
