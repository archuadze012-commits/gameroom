"use client";

import { useSyncExternalStore } from "react";
import { RotateCcw } from "lucide-react";

// Orientation/viewport is external browser state, so read it via
// useSyncExternalStore rather than syncing into local state from an effect.
function subscribeOrientation(callback: () => void) {
  window.addEventListener("resize", callback);
  window.addEventListener("orientationchange", callback);
  return () => {
    window.removeEventListener("resize", callback);
    window.removeEventListener("orientationchange", callback);
  };
}

// portrait-only guard on touch devices — no auto-fullscreen, no orientation lock.
function getPortraitTouchSnapshot() {
  return navigator.maxTouchPoints > 0 && window.innerHeight > window.innerWidth;
}

function getServerSnapshot() {
  return false;
}

export function LobbyOrientationGuard({ enabled = false }: { enabled?: boolean }) {
  const isPortraitTouch = useSyncExternalStore(subscribeOrientation, getPortraitTouchSnapshot, getServerSnapshot);
  const showRotate = enabled && isPortraitTouch;

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
