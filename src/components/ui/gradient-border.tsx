import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "violet" | "amber" | "magenta" | "cyan";

const gradients: Record<Tone, string> = {
  violet:  "linear-gradient(135deg, rgba(139,92,246,0.7) 0%, rgba(192,38,211,0.6) 100%)",
  amber:   "linear-gradient(135deg, rgba(245,165,36,0.7) 0%, rgba(255,107,53,0.6) 100%)",
  magenta: "linear-gradient(135deg, rgba(192,38,211,0.7) 0%, rgba(139,92,246,0.6) 100%)",
  cyan:    "linear-gradient(135deg, rgba(34,211,238,0.6) 0%, rgba(139,92,246,0.5) 100%)",
};

type Props = React.HTMLAttributes<HTMLDivElement> & {
  tone?: Tone;
  /** Border thickness in px. */
  thickness?: number;
  /** Radius in px. Use 0 + custom clip-path for cut-corner. */
  radius?: number;
  /** Inner background color. */
  innerBg?: string;
};

export function GradientBorder({
  tone = "violet",
  thickness = 1,
  radius = 14,
  innerBg = "var(--gr-bg-1)",
  className,
  style,
  children,
  ...rest
}: Props) {
  return (
    <div
      {...rest}
      className={cn("relative isolate", className)}
      style={{
        ...(style ?? {}),
        background: gradients[tone],
        padding: thickness,
        borderRadius: radius,
      }}
    >
      <div
        className="h-full w-full"
        style={{ background: innerBg, borderRadius: Math.max(0, radius - thickness) }}
      >
        {children}
      </div>
    </div>
  );
}
