import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  /** Optional label under the percentage (e.g. "ღია"). */
  label?: React.ReactNode;
  className?: string;
  tone?: "amber" | "violet" | "magenta";
};

const toneClasses: Record<NonNullable<Props["tone"]>, string> = {
  amber:   "bg-[var(--gr-grad-amber)] text-[#1a0e00]",
  violet:  "bg-[var(--gr-grad-violet)] text-white",
  magenta: "bg-[var(--gr-magenta)] text-white",
};

export function PercentBadge({ value, label, className, tone = "amber" }: Props) {
  return (
    <div
      className={cn(
        "inline-flex flex-col items-end gap-0 px-2.5 py-1 leading-none",
        "font-display font-extrabold",
        toneClasses[tone],
        className
      )}
      style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 8px 100%, 0 calc(100% - 8px))" }}
    >
      <span className="text-[15px] tabular-nums">{value}%</span>
      {label && (
        <span className="text-[8px] font-semibold uppercase tracking-[0.15em] opacity-80">
          {label}
        </span>
      )}
    </div>
  );
}
