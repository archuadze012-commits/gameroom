"use client";

import { type CSSProperties } from "react";

type GamerCardProps = {
  children: React.ReactNode;
  color?: string; // rgba string for border + glow
  clipSize?: number; // cut corner size px, default 14
  className?: string;
  style?: CSSProperties;
  hover?: boolean;
};

const CUT = (n: number) => `polygon(0 0, calc(100% - ${n}px) 0, 100% ${n}px, 100% 100%, 0 100%)`;

export function GamerCard({
  children,
  color = "rgba(236,72,153,0.55)",
  clipSize = 14,
  className = "",
  style,
  hover = false,
}: GamerCardProps) {
  const clip = CUT(clipSize);
  const hoverColor = color.replace(/[\d.]+\)$/, "0.85)");

  return (
    <div
      className={`relative isolate ${hover ? "group" : ""} ${className}`}
      style={{ clipPath: clip, background: color, padding: 1, ...style }}
      {...(hover
        ? {
            onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) =>
              (e.currentTarget.style.background = hoverColor),
            onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) =>
              (e.currentTarget.style.background = color),
          }
        : {})}
    >
      <section
        className="relative overflow-hidden bg-[var(--gr-bg-1)]"
        style={{ clipPath: clip }}
      >
        {/* top glow line */}
        <span
          aria-hidden
          className="absolute left-0 top-0 z-10 h-[2px] w-full"
          style={{ background: `linear-gradient(90deg,transparent,${color.replace(/[\d.]+\)$/, "0.9)")},transparent)` }}
        />
        {/* inner radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(ellipse at 50% 0%,${color.replace(/[\d.]+\)$/, "0.09)")} 0%,transparent 65%)` }}
        />
        {/* white laser on hover */}
        {hover && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-10 h-[2px] w-full translate-x-[-100%] opacity-0
                       group-hover:translate-x-[100%] group-hover:opacity-100
                       group-hover:transition-transform group-hover:duration-700"
            style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.8),transparent)" }}
          />
        )}
        {children}
      </section>
    </div>
  );
}
