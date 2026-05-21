import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  illustration?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Tone tints the illustration aura. */
  tone?: "accent" | "cyan" | "violet" | "lime" | "amber";
};

const auraTone: Record<NonNullable<Props["tone"]>, string> = {
  accent: "from-[var(--gr-accent)]/25",
  cyan:   "from-[var(--gr-cyan)]/25",
  violet: "from-[var(--gr-violet)]/25",
  lime:   "from-[var(--gr-lime)]/25",
  amber:  "from-[var(--gr-amber)]/25",
};

export function EmptyState({
  illustration,
  title,
  description,
  action,
  className,
  tone = "accent",
}: Props) {
  return (
    <div
      className={cn(
        "relative isolate flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-[var(--gr-border)] bg-[var(--gr-bg-elev-1)] px-6 py-10 text-center",
        className
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-24 left-1/2 -z-10 h-56 w-56 -translate-x-1/2 rounded-full bg-gradient-to-b to-transparent blur-3xl",
          auraTone[tone]
        )}
      />
      {illustration && (
        <div className="grid h-20 w-20 place-items-center rounded-2xl bg-[var(--gr-bg-elev-2)] text-[var(--gr-text)] ring-1 ring-[var(--gr-border-hi)]">
          {illustration}
        </div>
      )}
      <div className="max-w-md space-y-1.5">
        <h3 className="text-[17px] font-semibold text-[var(--gr-text)]">{title}</h3>
        {description && (
          <p className="text-[13.5px] leading-relaxed text-[var(--gr-text-mute)]">{description}</p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
