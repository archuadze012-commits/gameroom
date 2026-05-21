import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "violet" | "amber" | "magenta" | "lime" | "cyan";

const toneClasses: Record<Tone, string> = {
  violet:  "bg-[var(--gr-violet)] shadow-[0_0_10px_rgba(139,92,246,0.7)]",
  amber:   "bg-[var(--gr-amber)] shadow-[0_0_10px_rgba(245,165,36,0.7)]",
  magenta: "bg-[var(--gr-magenta)] shadow-[0_0_10px_rgba(192,38,211,0.7)]",
  lime:    "bg-[var(--gr-lime)] shadow-[0_0_10px_rgba(163,230,53,0.7)]",
  cyan:    "bg-[var(--gr-cyan-glow)] shadow-[0_0_10px_rgba(34,211,238,0.7)]",
};

type Props = {
  tone?: Tone;
  size?: "sm" | "md";
  pulse?: boolean;
  className?: string;
};

export function GlowDot({ tone = "violet", size = "sm", pulse = true, className }: Props) {
  const dim = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  return (
    <span className={cn("relative inline-grid place-items-center", dim, className)} aria-hidden>
      {pulse && (
        <span
          className={cn(
            "absolute inset-0 rounded-full opacity-50 motion-safe:animate-ping",
            toneClasses[tone]
          )}
        />
      )}
      <span className={cn("relative rounded-full", dim, toneClasses[tone])} />
    </span>
  );
}
