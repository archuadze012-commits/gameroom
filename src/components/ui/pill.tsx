import * as React from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "neutral" | "live" | "online" | "accent"
  | "cyan" | "violet" | "lime" | "amber";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-white/[0.04] text-[var(--gr-text-mute)] ring-1 ring-[var(--gr-border)]",
  live:    "bg-[color-mix(in_oklab,var(--gr-amber)_18%,transparent)] text-[var(--gr-amber)] ring-1 ring-[color-mix(in_oklab,var(--gr-amber)_40%,transparent)]",
  online:  "bg-[color-mix(in_oklab,var(--gr-lime)_15%,transparent)] text-[var(--gr-lime)] ring-1 ring-[color-mix(in_oklab,var(--gr-lime)_35%,transparent)]",
  accent:  "bg-[color-mix(in_oklab,var(--gr-accent)_15%,transparent)] text-[var(--gr-accent)] ring-1 ring-[color-mix(in_oklab,var(--gr-accent)_40%,transparent)]",
  cyan:    "bg-[color-mix(in_oklab,var(--gr-cyan)_15%,transparent)] text-[var(--gr-cyan)] ring-1 ring-[color-mix(in_oklab,var(--gr-cyan)_40%,transparent)]",
  violet:  "bg-[color-mix(in_oklab,var(--gr-violet)_18%,transparent)] text-[var(--gr-violet)] ring-1 ring-[color-mix(in_oklab,var(--gr-violet)_40%,transparent)]",
  lime:    "bg-[color-mix(in_oklab,var(--gr-lime)_15%,transparent)] text-[var(--gr-lime)] ring-1 ring-[color-mix(in_oklab,var(--gr-lime)_35%,transparent)]",
  amber:   "bg-[color-mix(in_oklab,var(--gr-amber)_18%,transparent)] text-[var(--gr-amber)] ring-1 ring-[color-mix(in_oklab,var(--gr-amber)_40%,transparent)]",
};

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  pulse?: boolean;
  icon?: React.ReactNode;
};

export function Pill({ tone = "neutral", pulse, icon, className, children, ...rest }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
        toneClasses[tone],
        className
      )}
      {...rest}
    >
      {pulse && (
        <span className="relative grid h-1.5 w-1.5 place-items-center">
          <span className="absolute inset-0 rounded-full bg-current opacity-60 motion-safe:animate-ping" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {icon}
      {children}
    </span>
  );
}
