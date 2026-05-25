"use client";

import type React from "react";

const COLORS = ["#a78bfa", "#22d3ee", "#f5a524", "#ff4d6d"];

// Deterministic pseudo-random (no Math.random — SSR safe, stable across renders)
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
  anim: "sp-up" | "sp-ul" | "sp-ur";
};

function makeSparkles(
  count: number,
  seed: number,
  leftMin: number,
  leftMax: number,
  bottomMax: number,
  isEdge: boolean,
): SparkDef[] {
  return Array.from({ length: count }, (_, i) => {
    const s = seed + i;
    const drift = Math.floor(pr(s + 600, 0, 3));
    const anim: SparkDef["anim"] =
      drift === 0 ? "sp-ul" : drift === 1 ? "sp-ur" : "sp-up";
    return {
      left:   `${pr(s,       leftMin, leftMax).toFixed(1)}%`,
      bottom: `${pr(s + 100, 0,       bottomMax).toFixed(1)}%`,
      size:    pr(s + 200, isEdge ? 0.9 : 0.6, isEdge ? 3.2 : 2.2),
      color:   COLORS[i % COLORS.length],
      dur:    `${pr(s + 300, isEdge ? 1.6 : 2.2, isEdge ? 4.2 : 5.8).toFixed(2)}s`,
      del:    `${pr(s + 400, 0, 5.0).toFixed(2)}s`,
      alpha:   pr(s + 500, isEdge ? 0.22 : 0.10, isEdge ? 0.58 : 0.30),
      anim,
    };
  });
}

const ALL_SPARKLES: SparkDef[] = [
  ...makeSparkles(80,   0,  0,  38, 55, true),   // left edge
  ...makeSparkles(80, 300, 62, 100, 55, true),   // right edge
  ...makeSparkles(60, 600, 12,  88, 30, false),  // center
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
          100% { opacity: 0; transform: translateY(-90px) scale(0.4); }
        }
        @keyframes sp-ul {
          0%   { opacity: 0; transform: translateY(0px) translateX(0px) scale(1); }
          12%  { opacity: var(--sa); }
          85%  { opacity: var(--sa); }
          100% { opacity: 0; transform: translateY(-80px) translateX(-14px) scale(0.35); }
        }
        @keyframes sp-ur {
          0%   { opacity: 0; transform: translateY(0px) translateX(0px) scale(1); }
          12%  { opacity: var(--sa); }
          85%  { opacity: var(--sa); }
          100% { opacity: 0; transform: translateY(-80px) translateX(14px) scale(0.35); }
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
                animation: `${s.anim} ${s.dur} ${s.del} ease-in-out infinite`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </>
  );
}
