import * as React from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "neutral" | "live" | "online" | "accent"
  | "cyan" | "violet" | "lime" | "amber" | "magenta";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-white/[0.04] text-[var(--gr-text-mute)] border border-white/5 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.2)]",
  live:    "bg-[color-mix(in_oklab,var(--gr-amber)_15%,transparent)] text-[#fde68a] border border-[var(--gr-amber)]/25 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] [text-shadow:0_0_10px_var(--gr-amber)]",
  online:  "bg-[color-mix(in_oklab,var(--gr-lime)_15%,transparent)] text-[#bbf7d0] border border-[var(--gr-lime)]/25 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] [text-shadow:0_0_10px_var(--gr-lime)]",
  accent:  "bg-[color-mix(in_oklab,var(--gr-accent)_15%,transparent)] text-[#e2e8f0] border border-[var(--gr-accent)]/25 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] [text-shadow:0_0_10px_var(--gr-accent)]",
  cyan:    "bg-[color-mix(in_oklab,var(--gr-cyan)_15%,transparent)] text-[#a5f3fc] border border-[var(--gr-cyan)]/25 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] [text-shadow:0_0_10px_var(--gr-cyan)]",
  violet:  "bg-[color-mix(in_oklab,var(--gr-violet)_15%,transparent)] text-[#e9d5ff] border border-[var(--gr-violet)]/25 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] [text-shadow:0_0_10px_var(--gr-violet)]",
  lime:    "bg-[color-mix(in_oklab,var(--gr-lime)_15%,transparent)] text-[#bbf7d0] border border-[var(--gr-lime)]/25 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] [text-shadow:0_0_10px_var(--gr-lime)]",
  amber:   "bg-[color-mix(in_oklab,var(--gr-amber)_15%,transparent)] text-[#fde68a] border border-[var(--gr-amber)]/25 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] [text-shadow:0_0_10px_var(--gr-amber)]",
  magenta: "bg-[rgba(236,72,153,0.15)] text-[#fbcfe8] border border-[rgba(236,72,153,0.35)] backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] [text-shadow:0_0_10px_rgba(236,72,153,1)]",
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
