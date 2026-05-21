import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "violet" | "amber" | "magenta";

const toneClasses: Record<Tone, string> = {
  violet:  "bg-[var(--gr-violet)] shadow-[0_0_16px_rgba(139,92,246,0.6)]",
  amber:   "bg-[var(--gr-amber)] shadow-[0_0_16px_rgba(245,165,36,0.6)]",
  magenta: "bg-[var(--gr-magenta)] shadow-[0_0_16px_rgba(192,38,211,0.6)]",
};

type Props = {
  size?: number;
  tone?: Tone;
  className?: string;
  /** Add a tiny amber notch in the corner. */
  notch?: boolean;
};

export function DiamondAccent({ size = 10, tone = "violet", className, notch }: Props) {
  return (
    <span className={cn("relative inline-block", className)} aria-hidden>
      <span
        className={cn("block rotate-45", toneClasses[tone])}
        style={{ width: size, height: size }}
      />
      {notch && (
        <span
          className="absolute -right-1 -top-1 h-1.5 w-1.5 rotate-45 bg-[var(--gr-amber)]"
        />
      )}
    </span>
  );
}
