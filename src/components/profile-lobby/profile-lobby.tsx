"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const LobbyScene = dynamic(() => import("./lobby-scene"), {
  ssr: false,
  loading: () => null,
});

type Props = {
  username: string;
  displayName?: string | null;
  level?: number;
  className?: string;
  /** Aspect / height behavior. Default: hero-banner sized. */
  height?: string;
};

/**
 * 3D "gaming lobby" hero — dark gamer-hall, red/blue/magenta light bars,
 * Georgian Borjghali emblem on the floor, neon GAMEROOM sign on the back wall.
 * Lazy-mounts on viewport intersection so non-visible profile cards don't pay
 * the WebGL cost.
 */
export function ProfileLobby({
  username,
  displayName,
  level,
  className,
  height = "h-64 md:h-80",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(
    () => typeof window !== "undefined" && typeof IntersectionObserver === "undefined"
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`relative w-full overflow-hidden bg-[#08060F] ${height} ${className ?? ""}`}
    >
      {/* the 3D canvas */}
      {inView && (
        <div className="absolute inset-0">
          <LobbyScene />
        </div>
      )}

      {/* fallback while scene loads */}
      {!inView && (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#2A1056] via-[#0E0B1A] to-[#08060F]" />
          <div className="absolute inset-x-0 top-0 h-1/2 bg-[radial-gradient(ellipse_at_center,rgba(192,38,211,0.35),transparent_70%)]" />
        </div>
      )}

      {/* subtle violet rim along the bottom edge to fade into the dark page */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[var(--gr-bg-0)]"
      />

      {/* faint scanlines for arcade vibe */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0 2px, rgba(255,255,255,0.6) 2px 3px)",
        }}
      />

      {/* 2D HUD overlay — username + level */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-5 sm:p-8">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gr-amber)]">
              <span aria-hidden className="h-1.5 w-1.5 bg-current" />
              ქართველი გეიმერების სახლი
            </span>
            <h2
              className="mt-2 font-display text-[28px] font-extrabold leading-none tracking-tight text-white sm:text-[36px]"
              style={{ textShadow: "0 0 18px rgba(192,38,211,0.6), 0 0 36px rgba(255,77,109,0.4)" }}
            >
              {displayName ?? username}
            </h2>
            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/60">
              @{username}
            </p>
          </div>
          {level != null && (
            <div
              className="pointer-events-auto shrink-0 bg-[linear-gradient(135deg,var(--gr-magenta)_0%,var(--gr-cyan-glow)_100%)] px-3 py-2 text-center text-white shadow-[0_0_22px_rgba(192,38,211,0.28),0_0_28px_rgba(34,211,238,0.18)]"
              style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 8px 100%, 0 calc(100% - 8px))" }}
            >
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] opacity-80">level</div>
              <div className="font-display text-[22px] font-extrabold leading-none tabular-nums">
                {level}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
