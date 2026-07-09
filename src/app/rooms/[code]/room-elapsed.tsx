"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

type Props = {
  createdAt: string;
  expiresAt: string;
};

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}წმ`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}წთ ${s}წმ`;
  const h = Math.floor(m / 60);
  return `${h}სთ ${m % 60}წთ`;
}

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return "ვადა გავიდა";
  if (seconds < 60) return `${seconds}წმ`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function RoomElapsed({ createdAt, expiresAt }: Props) {
  // Seed from createdAt (a prop) rather than Date.now(): Date.now() differs
  // between the server render and client hydration → hydration mismatch. The
  // effect corrects to the real clock immediately on mount.
  const [now, setNow] = useState(() => new Date(createdAt).getTime());

  useEffect(() => {
    // Correct to the real clock in an async callback (rAF), not synchronously in
    // the effect body — keeps react-hooks/set-state-in-effect happy while still
    // updating within one frame of mount.
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  const createdMs = new Date(createdAt).getTime();
  const expiresMs = new Date(expiresAt).getTime();
  const elapsedSec = Math.max(0, Math.floor((now - createdMs) / 1000));
  const remainingSec = Math.max(0, Math.floor((expiresMs - now) / 1000));
  const isExpiringSoon = remainingSec > 0 && remainingSec < 60 * 5; // < 5 min

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex items-center gap-2 bg-[var(--gr-bg-2)] px-3 py-1.5 ring-1 ring-[var(--gr-border)]">
        <Clock className="h-3.5 w-3.5 text-[var(--gr-text-mute)]" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-text-dim)]">
            გასულია
          </span>
          <span className="font-mono text-[12px] font-bold text-white tabular-nums">
            {formatElapsed(elapsedSec)}
          </span>
        </div>
      </div>

      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 ring-1 ${
          remainingSec <= 0
            ? "bg-red-500/10 text-red-300 ring-red-500/40"
            : isExpiringSoon
              ? "bg-amber-500/10 text-amber-200 ring-amber-500/40"
              : "bg-[var(--gr-bg-2)] text-[var(--gr-text-mute)] ring-[var(--gr-border)]"
        }`}
      >
        <div className="flex items-baseline gap-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-[0.16em] opacity-80">
            დარჩა
          </span>
          <span className="font-mono text-[12px] font-bold tabular-nums">
            {formatRemaining(remainingSec)}
          </span>
        </div>
      </div>
    </div>
  );
}
