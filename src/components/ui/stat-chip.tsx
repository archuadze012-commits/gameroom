import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "accent" | "cyan" | "violet" | "lime" | "amber";
  className?: string;
};

const iconTone: Record<NonNullable<Props["tone"]>, string> = {
  neutral: "text-[var(--gr-text-mute)]",
  accent:  "text-[var(--gr-accent)]",
  cyan:    "text-[var(--gr-cyan)]",
  violet:  "text-[var(--gr-violet)]",
  lime:    "text-[var(--gr-lime)]",
  amber:   "text-[var(--gr-amber)]",
};

export function StatChip({ icon, label, value, tone = "neutral", className }: Props) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-[var(--gr-border)] bg-[var(--gr-bg-elev-2)]/60 px-2.5 py-1.5",
        className
      )}
    >
      {icon && (
        <span className={cn("grid h-6 w-6 place-items-center rounded-md bg-white/[0.03]", iconTone[tone])}>
          {icon}
        </span>
      )}
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wide text-[var(--gr-text-dim)]">{label}</span>
        <span className="text-[13px] font-semibold tabular-nums text-[var(--gr-text)]">{value}</span>
      </div>
    </div>
  );
}
