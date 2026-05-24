"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type StartState = "idle" | "searching" | "found" | "disabled";

type LobbyStartButtonProps = {
  href: string;
  disabled?: boolean;
  allReady?: boolean;
};

export function LobbyStartButton({ href, disabled = false, allReady = false }: LobbyStartButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<StartState>(disabled ? "disabled" : "idle");
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (disabled) {
      setState("disabled");
      return;
    }

    setState((current) => (current === "disabled" ? "idle" : current));
  }, [disabled]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const startMatchmaking = () => {
    if (state !== "idle") {
      return;
    }

    setState("searching");
    timersRef.current.push(
      window.setTimeout(() => setState("found"), 1500),
      window.setTimeout(() => router.push(href), 1700),
    );
  };

  const isSearching = state === "searching";
  const isFound = state === "found";
  const isDisabled = state === "disabled";

  return (
    <button
      type="button"
      disabled={isDisabled || isSearching || isFound}
      onClick={startMatchmaking}
      className={[
        "lobby-start-button motion-safe:lobby-start-glow relative grid h-20 w-[220px] shrink-0 place-items-center overflow-hidden px-6 font-display text-[26px] font-black uppercase tracking-[0.2em] text-[var(--gr-bg-0)] shadow-[var(--gr-glow-amber)] transition-[filter,transform,border-color] [clip-path:polygon(0_0,calc(100%_-_18px)_0,100%_18px,100%_100%,18px_100%,0_calc(100%_-_18px))] active:scale-[0.97] max-[760px]:h-16 max-[760px]:w-[180px] max-[760px]:text-[20px]",
        allReady ? "ring-2 ring-[var(--gr-lime)]" : "ring-1 ring-[color-mix(in_srgb,var(--gr-amber)_76%,transparent)]",
        isSearching ? "lobby-start-searching" : "",
        isFound ? "lobby-start-found" : "",
        isDisabled ? "cursor-not-allowed opacity-55" : "hover:brightness-110",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-live="polite"
    >
      <span className="lobby-start-shine motion-safe:lobby-start-shimmer" aria-hidden="true" />
      {isSearching ? <span className="lobby-start-spinner motion-safe:lobby-start-spinner-spin" aria-hidden="true" /> : null}
      <span className="relative z-10">
        {isSearching ? (
          <>
            Finding Match<span className="lobby-match-dots motion-safe:lobby-match-dots-pulse">...</span>
          </>
        ) : isFound ? (
          "Found"
        ) : (
          "Start"
        )}
      </span>
    </button>
  );
}
