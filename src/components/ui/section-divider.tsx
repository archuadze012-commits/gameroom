import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  /** Direction of the bleed. `down` = top section is darker than bottom. */
  direction?: "down" | "up";
  /** Top fill color (CSS color value). */
  topColor?: string;
  /** Bottom fill color. */
  bottomColor?: string;
  className?: string;
  /** Add a thin violet accent line at the cut edge. */
  accent?: boolean;
};

export function SectionDivider({
  direction = "down",
  topColor = "var(--gr-bg-0)",
  bottomColor = "var(--gr-bg-light)",
  className,
  accent = true,
}: Props) {
  const flip = direction === "up";
  return (
    <div className={cn("relative h-16 w-full overflow-hidden", className)} aria-hidden>
      <svg
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className={cn("absolute inset-0 h-full w-full", flip && "scale-y-[-1]")}
      >
        <polygon points="0,0 1440,0 1440,80 0,40" fill={topColor} />
        <polygon points="0,40 1440,80 1440,80 0,80" fill={bottomColor} />
        {accent && (
          <polyline
            points="0,40 1440,80"
            fill="none"
            stroke="rgba(168, 85, 247, 0.35)"
            strokeWidth="1.5"
          />
        )}
      </svg>
    </div>
  );
}
