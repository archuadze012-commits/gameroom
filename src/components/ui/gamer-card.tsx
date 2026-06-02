"use client";

import { type CSSProperties } from "react";

type GamerCardProps = {
  children: React.ReactNode;
  color?: string;
  clipSize?: number;
  className?: string;
  surfaceClassName?: string;
  style?: CSSProperties;
  hover?: boolean;
  sideGlow?: boolean;
  innerGlow?: "default" | "soft" | "none";
  showSideBorders?: boolean;
};

export const GAMER_CARD_CYAN = "rgba(34,211,238,1)";
export const GAMER_CARD_CRIMSON = "rgba(196,30,58,0.78)";

function cutPolygon(size: number) {
  void size;
  return "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
}

function withAlpha(color: string, alpha: number) {
  const match = color.match(/rgba?\(([^)]+)\)/i);
  if (!match) return color;
  const parts = match[1].split(",").map((part) => part.trim());
  if (parts.length < 3) return color;
  return `rgba(${parts[0]},${parts[1]},${parts[2]},${alpha})`;
}

export function GamerCard({
  children,
  color = GAMER_CARD_CRIMSON,
  clipSize = 14,
  className = "",
  surfaceClassName = "",
  style,
  hover = false,
  sideGlow = false,
  innerGlow = "default",
  showSideBorders = true,
}: GamerCardProps) {
  const clip = cutPolygon(clipSize);
  const accentSolid = withAlpha(color, 1);
  const accentAmbient = withAlpha(color, 0.38);
  const innerGlowOpacity = innerGlow === "none" ? 0 : innerGlow === "soft" ? 0.5 : 1;

  return (
    <div
      className={`relative isolate ${hover ? "group" : ""} ${className}`}
      style={{
        clipPath: clip,
        background: `linear-gradient(180deg,${GAMER_CARD_CYAN} 0%,color-mix(in_srgb,${GAMER_CARD_CYAN} 38%,${accentSolid}) 48%,${accentSolid} 100%)`,
        paddingTop: 1,
        paddingBottom: 1,
        paddingLeft: showSideBorders ? 1 : 0,
        paddingRight: showSideBorders ? 1 : 0,
        ...style,
      }}
    >
      <section
        className={`relative overflow-hidden bg-[var(--gr-bg-1)] ${surfaceClassName}`}
        style={{ clipPath: clip }}
      >
        <span
          aria-hidden
          className="absolute left-0 top-0 z-10 h-[4px] w-full"
          style={{
            background: `linear-gradient(90deg,transparent 0%,rgba(34,211,238,0.14) 1%,rgba(34,211,238,0.34) 10%,${GAMER_CARD_CYAN} 50%,rgba(34,211,238,0.34) 90%,rgba(34,211,238,0.14) 99%,transparent 100%)`,
            boxShadow: "0 0 26px rgba(34,211,238,1), 0 0 58px rgba(34,211,238,0.82)",
          }}
        />
        {showSideBorders && (
          <span
            aria-hidden
            className="absolute left-0 top-0 z-10 h-full w-[3px]"
            style={{
              background: `linear-gradient(180deg,${GAMER_CARD_CYAN} 0%,color-mix(in_srgb,${GAMER_CARD_CYAN} 38%,${accentSolid}) 48%,${accentSolid} 100%)`,
              boxShadow: sideGlow
                ? `0 0 18px ${withAlpha(accentSolid, 0.62)}, 0 0 26px ${withAlpha(accentSolid, 0.48)}, inset -1px 0 0 rgba(255,255,255,0.12)`
                : "inset -1px 0 0 rgba(255,255,255,0.12)",
            }}
          />
        )}
        {showSideBorders && (
          <span
            aria-hidden
            className="absolute right-0 top-0 z-10 h-full w-[3px]"
            style={{
              background: `linear-gradient(180deg,${GAMER_CARD_CYAN} 0%,color-mix(in_srgb,${GAMER_CARD_CYAN} 38%,${accentSolid}) 48%,${accentSolid} 100%)`,
              boxShadow: sideGlow
                ? `0 0 18px rgba(34,211,238,0.7), 0 0 26px rgba(34,211,238,0.54), inset 1px 0 0 rgba(255,255,255,0.12)`
                : "inset 1px 0 0 rgba(255,255,255,0.12)",
            }}
          />
        )}
        <span
          aria-hidden
          className="absolute bottom-0 left-0 z-10 h-[4px] w-full"
          style={{
            background: `linear-gradient(90deg,transparent 0%,${withAlpha(accentSolid, 0.14)} 1%,${withAlpha(accentSolid, 0.34)} 10%,${accentSolid} 50%,${withAlpha(accentSolid, 0.34)} 90%,${withAlpha(accentSolid, 0.14)} 99%,transparent 100%)`,
            boxShadow: `0 0 26px ${accentSolid}, 0 0 58px ${withAlpha(accentSolid, 0.82)}`,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse_at_18%_0%,rgba(34,211,238,0.34)_0%,transparent_52%),radial-gradient(ellipse_at_85%_12%,rgba(34,211,238,0.22)_0%,transparent_42%),radial-gradient(ellipse_at_24%_100%,${accentAmbient}_0%,transparent_52%),radial-gradient(ellipse_at_82%_88%,${withAlpha(accentSolid, 0.36)}_0%,transparent_44%),radial-gradient(circle_at_50%_48%,rgba(34,211,238,0.08)_0%,${withAlpha(accentSolid, 0.06)}_48%,transparent_74%)`,
            opacity: innerGlowOpacity,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            boxShadow: `inset 0 0 34px rgba(34,211,238,0.08), inset 0 -12px 30px ${withAlpha(accentSolid, 0.12)}, inset 0 10px 26px rgba(34,211,238,0.06)`,
            opacity: innerGlowOpacity,
          }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-[0.08]" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle_at_top_right,${withAlpha(accentSolid, 0.38)},transparent_38%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.28),transparent_40%),radial-gradient(circle_at_52%_52%,rgba(255,255,255,0.03),transparent_34%),linear-gradient(180deg,transparent_4%,rgba(7,6,16,0.06)_40%,rgba(7,6,16,0.86)_100%)`,
          }}
        />
        {hover ? (
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-[11] h-[4px] w-full translate-x-[-100%] opacity-0 transition-transform duration-700 group-hover:translate-x-[100%] group-hover:opacity-100"
            style={{
              background: `linear-gradient(90deg,transparent 0%,${withAlpha(accentSolid, 0.16)} 18%,${withAlpha(accentSolid, 0.98)} 50%,${withAlpha(accentSolid, 0.16)} 82%,transparent 100%)`,
              boxShadow: `0 0 16px ${withAlpha(accentSolid, 0.96)}, 0 0 30px ${withAlpha(accentSolid, 0.76)}`,
            }}
          />
        ) : null}
        {children}
      </section>
    </div>
  );
}
