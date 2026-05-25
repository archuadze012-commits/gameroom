"use client";

import type React from "react";

const COLORS = ["#a78bfa", "#22d3ee", "#f5a524", "#ff4d6d"];

function pr(seed: number, min: number, max: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return min + (x - Math.floor(x)) * (max - min);
}

type SparkDef = {
  left: string;
  bottom: string;
  size: number;
  color: string;
  dur: string;
  del: string;
  alpha: number;
  riseH: number;
  anim: "sp-up" | "sp-ul" | "sp-ur";
};

function makeSparkles(
  count: number,
  seed: number,
  leftMin: number,
  leftMax: number,
  bottomMax: number,
  isEdge: boolean,
  edgeSide: "left" | "right" | null,
): SparkDef[] {
  return Array.from({ length: count }, (_, i) => {
    const s = seed + i;
    const leftVal = pr(s, leftMin, leftMax);

    let riseH = 90;
    if (edgeSide === "left") {
      // 0% = tallest, leftMax = shortest
      const t = (leftVal - leftMin) / (leftMax - leftMin);
      riseH = Math.round(200 - t * 130);
    } else if (edgeSide === "right") {
      // leftMax (100%) = tallest, leftMin = shortest
      const t = (leftMax - leftVal) / (leftMax - leftMin);
      riseH = Math.round(200 - t * 130);
    }

    const drift = Math.floor(pr(s + 600, 0, 3));
    const anim: SparkDef["anim"] =
      drift === 0 ? "sp-ul" : drift === 1 ? "sp-ur" : "sp-up";

    return {
      left:   `${leftVal.toFixed(1)}%`,
      bottom: `${pr(s + 100, 0, bottomMax).toFixed(1)}%`,
      size:    pr(s + 200, isEdge ? 0.9 : 0.6, isEdge ? 3.2 : 2.2),
      color:   COLORS[i % COLORS.length],
      dur:    `${pr(s + 300, isEdge ? 1.6 : 2.2, isEdge ? 4.2 : 5.8).toFixed(2)}s`,
      del:    `${pr(s + 400, 0, 5.0).toFixed(2)}s`,
      alpha:   pr(s + 500, isEdge ? 0.22 : 0.10, isEdge ? 0.58 : 0.30),
      riseH,
      anim,
    };
  });
}

const ALL_SPARKLES: SparkDef[] = [
  ...makeSparkles(160,    0,  0,  38,  8, true,  "left"),
  ...makeSparkles(160,  500, 62, 100,  8, true,  "right"),
  ...makeSparkles( 60, 1000, 12,  88,  6, false,  null),
];

type Props = { className?: string };

export function LobbyCanvas({ className }: Props) {
  return (
    <>
      <style>{`
        @keyframes sp-up {
          0%   { opacity: 0; transform: translateY(0px) scale(1); }
          12%  { opacity: var(--sa); }
          85%  { opacity: var(--sa); }
          100% { opacity: 0; transform: translateY(calc(var(--rh) * -1px)) scale(0.4); }
        }
        @keyframes sp-ul {
          0%   { opacity: 0; transform: translateY(0px) translateX(0px) scale(1); }
          12%  { opacity: var(--sa); }
          85%  { opacity: var(--sa); }
          100% { opacity: 0; transform: translateY(calc(var(--rh) * -1px)) translateX(-14px) scale(0.35); }
        }
        @keyframes sp-ur {
          0%   { opacity: 0; transform: translateY(0px) translateX(0px) scale(1); }
          12%  { opacity: var(--sa); }
          85%  { opacity: var(--sa); }
          100% { opacity: 0; transform: translateY(calc(var(--rh) * -1px)) translateX(14px) scale(0.35); }
        }
      `}</style>
      <div
        className={`absolute inset-0 pointer-events-none ${className ?? ""}`}
        style={{ overflow: "hidden" }}
      >
        {ALL_SPARKLES.map((s, i) => (
          <div
            key={i}
            style={
              {
                position: "absolute",
                left: s.left,
                bottom: s.bottom,
                width: `${s.size}px`,
                height: `${s.size}px`,
                borderRadius: "50%",
                background: s.color,
                boxShadow: `0 0 ${(s.size * 2).toFixed(1)}px ${s.color}`,
                mixBlendMode: "screen",
                "--sa": s.alpha,
                "--rh": s.riseH,
                animation: `${s.anim} ${s.dur} ${s.del} ease-in-out infinite`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </>
  );
}
