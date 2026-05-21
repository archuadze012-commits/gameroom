import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "amber" | "violet" | "magenta" | "cyan" | "mute";

const tone: Record<Tone, string> = {
  amber:   "text-[var(--gr-amber)]",
  violet:  "text-[var(--gr-violet-hi)]",
  magenta: "text-[var(--gr-magenta)]",
  cyan:    "text-[var(--gr-cyan-glow)]",
  mute:    "text-[var(--gr-text-mute)]",
};

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  /** Show a leading 4px square in the same color. */
  square?: boolean;
};

export function Eyebrow({ tone: t = "amber", square = true, className, children, ...rest }: Props) {
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex items-center gap-2 text-[11px] font-semibold uppercase",
        "tracking-[0.18em] leading-none",
        tone[t],
        className
      )}
    >
      {square && <span aria-hidden className="h-1.5 w-1.5 bg-current" />}
      {children}
    </span>
  );
}
