import * as React from "react";
import { cn } from "@/lib/utils";

type Side = "left" | "right";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  side?: Side;
  /** Show the small amber rectangular tag in the cut corner. */
  amberNotch?: boolean;
  /** Background tone. */
  tone?: "dark" | "violet" | "amber";
};

const toneClasses = {
  dark:   "bg-[var(--gr-bg-2)] text-[var(--gr-text)]",
  violet: "bg-[var(--gr-grad-violet)] text-white",
  amber:  "bg-[var(--gr-grad-amber)] text-[#1a0e00]",
} as const;

export function RibbonTag({
  side = "left",
  amberNotch = true,
  tone = "dark",
  className,
  children,
  ...rest
}: Props) {
  const clip =
    side === "left"
      ? "polygon(16px 0, 100% 0, 100% 100%, 0 100%)"
      : "polygon(0 0, calc(100% - 16px) 0, 100% 100%, 0 100%)";
  return (
    <div
      {...rest}
      className={cn(
        "relative inline-flex items-center px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.16em]",
        toneClasses[tone],
        className
      )}
      style={{ clipPath: clip }}
    >
      {amberNotch && (
        <span
          aria-hidden
          className={cn(
            "absolute top-0 h-1.5 w-3 bg-[var(--gr-amber)]",
            side === "left" ? "left-3" : "right-3"
          )}
        />
      )}
      {children}
    </div>
  );
}
