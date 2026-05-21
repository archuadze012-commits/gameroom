import * as React from "react";
import { cn } from "@/lib/utils";

type Corner = "tl" | "tr" | "bl" | "br";
type Tone = "dark" | "light";
type Accent = "violet" | "amber" | "magenta" | "cyan";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  corner?: Corner;
  /** Notch size in pixels. */
  notch?: number;
  tone?: Tone;
  accent?: Accent;
  /** Render a 1px gradient border via background-clip trick. */
  gradientBorder?: boolean;
  /** Run the diagonal light-sweep animation on hover (ignored if reduced-motion). */
  sweep?: boolean;
  as?: React.ElementType;
};

function polygonFor(corner: Corner, notch: number) {
  // values in px since clip-path can mix px/%
  const n = `${notch}px`;
  switch (corner) {
    case "tl":
      return `polygon(${n} 0, 100% 0, 100% 100%, 0 100%, 0 ${n})`;
    case "tr":
      return `polygon(0 0, calc(100% - ${n}) 0, 100% ${n}, 100% 100%, 0 100%)`;
    case "bl":
      return `polygon(0 0, 100% 0, 100% 100%, ${n} 100%, 0 calc(100% - ${n}))`;
    case "br":
      return `polygon(0 0, 100% 0, 100% calc(100% - ${n}), calc(100% - ${n}) 100%, 0 100%)`;
  }
}

const toneClasses = {
  dark: "bg-[var(--gr-bg-1)] text-[var(--gr-text)]",
  light: "bg-[var(--gr-bg-light-2)] text-[var(--gr-text-on-lt)]",
} as const;

const accentBorder: Record<Accent, string> = {
  violet:  "before:[background:linear-gradient(135deg,rgba(139,92,246,0.7),rgba(192,38,211,0.7))]",
  amber:   "before:[background:linear-gradient(135deg,rgba(245,165,36,0.7),rgba(255,107,53,0.7))]",
  magenta: "before:[background:linear-gradient(135deg,rgba(192,38,211,0.7),rgba(139,92,246,0.6))]",
  cyan:    "before:[background:linear-gradient(135deg,rgba(34,211,238,0.7),rgba(139,92,246,0.5))]",
};

export function AngularCard({
  corner = "tr",
  notch = 24,
  tone = "dark",
  accent = "violet",
  gradientBorder = true,
  sweep = false,
  className,
  style,
  children,
  as: Tag = "div",
  ...rest
}: Props) {
  const clip = polygonFor(corner, notch);
  return (
    <Tag
      {...rest}
      data-angular-card
      style={{ ...(style ?? {}), clipPath: clip }}
      className={cn(
        "relative isolate",
        gradientBorder &&
          // padding-box / mask trick: the ::before fills the shape with a gradient,
          // then a slightly smaller bg layer on the element itself sits on top.
          [
            "before:absolute before:inset-0 before:-z-10 before:content-['']",
            "before:[clip-path:inherit]",
            accentBorder[accent],
          ].join(" "),
        toneClasses[tone],
        sweep && "gr-sweep",
        className
      )}
    >
      {/* inner padding-box that masks all but a 1px border edge */}
      {gradientBorder ? (
        <span
          aria-hidden
          className={cn(
            "absolute inset-[1px] -z-10",
            "[clip-path:inherit]",
            tone === "dark" ? "bg-[var(--gr-bg-1)]" : "bg-[var(--gr-bg-light-2)]"
          )}
        />
      ) : null}
      {children}
    </Tag>
  );
}
