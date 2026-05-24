"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

export function LobbyOrientationGuard() {
  const [showRotate, setShowRotate] = useState(false);

  useEffect(() => {
    const isTouch = () => navigator.maxTouchPoints > 0;

    const check = () => {
      if (!isTouch()) return setShowRotate(false);
      const portrait = window.innerHeight > window.innerWidth;
      setShowRotate(portrait);

      if (!portrait) {
        // landscape — request fullscreen
        const el = document.documentElement;
        if (el.requestFullscreen && !document.fullscreenElement) {
          el.requestFullscreen().catch(() => {});
        }
        // lock orientation if supported
        try {
          const orientation = screen.orientation as ScreenOrientation & {
            lock?: (orientation: string) => Promise<void>;
          };
          orientation.lock?.("landscape").catch(() => {});
        } catch {}
      }
    };

    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  if (!showRotate) return null;

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-6 bg-[#08060F] text-center">
      <RotateCcw className="h-16 w-16 animate-spin text-[var(--gr-violet)]" style={{ animationDuration: "2s" }} />
      <p className="text-[15px] font-semibold uppercase tracking-[0.2em] text-white/80">
        მოაბრუნე ტელეფონი
      </p>
      <p className="text-[11px] tracking-[0.14em] text-white/40">
        ლობი ლანდსკეიპ რეჟიმშია
      </p>
    </div>
  );
}
