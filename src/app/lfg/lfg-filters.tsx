"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useHydrated } from "@/lib/use-hydrated";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X, Radio, ChevronDown, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { mockGames } from "@/lib/mock-data";
import { GameIcon } from "@/components/game-icon";
import { useFavoriteSlugs } from "@/lib/use-favorite-slugs";

function PremiumCard({
  children,
  className = "",
  glowVariant = "default",
  noHover = false,
}: {
  children: React.ReactNode;
  className?: string;
  glowVariant?: "default" | "tight";
  noHover?: boolean;
}) {
  return (
    <div className={`group relative block rounded-[20px] transition-all duration-500 ${noHover ? "" : "hover:-translate-y-1"}`}>
      <div
        className={`relative z-10 w-full rounded-[20px] bg-[#0a0714]/5 border border-white/5 transition-all duration-500 group-hover:bg-[#0a0714]/10 overflow-visible ${glowVariant === 'tight' ? 'premium-card-glow-tight' : 'premium-card-glow'} ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

export function LfgFilters() {
  const router = useRouter();
  const params = useSearchParams();
  // Favorites are read client-side so the /lfg page needn't do a per-request
  // session + profile lookup on the server (it only sorts favorites first here).
  const favoriteSlugs = useFavoriteSlugs();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pickerRect, setPickerRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const mounted = useHydrated();
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const close = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        const panel = document.getElementById("lfg-game-picker-panel");
        if (panel && panel.contains(e.target as Node)) return;
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [pickerOpen]);

  const games = [...mockGames].sort((a, b) => {
    const aFav = favoriteSlugs.includes(a.slug) ? 1 : 0;
    const bFav = favoriteSlugs.includes(b.slug) ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;
    return b.favoritedBy - a.favoritedBy;
  });

  const update = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      router.push(`/lfg${next.toString() ? `?${next.toString()}` : ""}`);
    },
    [params, router],
  );

  const hasActive = params.toString().length > 0;

  return (
    <>
    <PremiumCard noHover className="p-4 space-y-5 overflow-visible">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]">
            live filters
          </p>
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
            <Filter className="h-4 w-4 shrink-0 text-cyan-400" /> ფილტრები
          </h2>
        </div>
        {hasActive ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/lfg")}
            className="h-8 shrink-0 rounded-full border border-pink-500/30 bg-pink-500/5 px-3 text-[11px] uppercase tracking-[0.12em] text-pink-400 hover:bg-pink-500/10 hover:text-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.15)] transition-all"
          >
            <X className="mr-1 h-3 w-3" /> გასუფთავება
          </Button>
        ) : null}
      </div>

      <div className="space-y-5">
        <FilterGroup label="თამაში">
          {/* Game Picker */}
          <div className="relative w-full z-[200]">
            <button
              type="button"
              ref={btnRef}
              onClick={() => {
                if (!pickerOpen && btnRef.current) {
                  const rect = btnRef.current.getBoundingClientRect();
                  setPickerRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
                }
                setPickerOpen((v) => !v);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/80 transition-colors hover:border-cyan-400/40 hover:text-white"
            >
              <span className="flex items-center gap-2">
                {params.get("game") ? (
                  <>
                    <GameIcon game={games.find(g => g.slug === params.get("game"))!} size="sm" />
                    <span className="font-semibold">{games.find(g => g.slug === params.get("game"))?.nameKa}</span>
                  </>
                ) : (
                  <span className="text-white/50">ყველა თამაში</span>
                )}
              </span>
              <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
            </button>

          </div>
        </FilterGroup>

        <FilterGroup label="დამატებითი">
          <FilterButton
            icon={<Radio className="h-3.5 w-3.5" />}
            label="მხოლოდ voice-ით"
            active={params.get("voice") === "1"}
            variant="pink"
            onClick={() => update("voice", params.get("voice") === "1" ? null : "1")}
          />
        </FilterGroup>
      </div>
    </PremiumCard>

    {mounted && pickerOpen && pickerRect && createPortal(
      <div
        id="lfg-game-picker-panel"
        className="fixed z-[9999] rounded-xl border border-white/10 bg-[#0a0714] shadow-2xl overflow-hidden"
        style={{ top: pickerRect.top, left: pickerRect.left, width: pickerRect.width }}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 bg-[#0a0714]">
          <Search className="h-3.5 w-3.5 text-white/40" />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ძებნა..."
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
        </div>
        <div className="max-h-52 overflow-y-auto py-1 bg-[#0a0714] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          <button
            type="button"
            onClick={() => { update("game", null); setPickerOpen(false); setSearch(""); }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-white/5 ${!params.get("game") ? "text-cyan-400" : "text-white/60"}`}
          >
            ყველა თამაში
          </button>
          {games.filter(g => g.nameKa.toLowerCase().includes(search.toLowerCase())).map((g) => (
            <button
              key={g.slug}
              type="button"
              onClick={() => { update("game", g.slug); setPickerOpen(false); setSearch(""); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-white/5 ${params.get("game") === g.slug ? "text-cyan-400" : "text-white/70"}`}
            >
              <GameIcon game={g} size="sm" />
              {g.nameKa}
            </button>
          ))}
        </div>
      </div>,
      document.body
    )}
    </>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase font-black tracking-wider text-white/50">
        {label}
      </Label>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterButton({
  icon,
  label,
  active,
  onClick,
  variant = "cyan",
}: {
  icon?: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: "cyan" | "violet" | "pink";
}) {
  const activeStyles = {
    cyan: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.25)]",
    violet: "border-violet-500/40 bg-violet-500/10 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.25)]",
    pink: "border-pink-500/40 bg-pink-500/10 text-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.25)]",
  };

  const activeTextGlow = {
    cyan: "rgba(34,211,238,0.4)",
    violet: "rgba(139,92,246,0.4)",
    pink: "rgba(236,72,153,0.4)",
  };

  const hoverBorderColor = {
    cyan: "hover:border-cyan-400/50 hover:text-cyan-200",
    violet: "hover:border-violet-400/50 hover:text-violet-200",
    pink: "hover:border-pink-400/50 hover:text-pink-200",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
        active
          ? activeStyles[variant]
          : `border-white/10 bg-white/5 text-white/70 ${hoverBorderColor[variant]}`
      }`}
      style={active ? { textShadow: `0 0 6px ${activeTextGlow[variant]}` } : {}}
    >
      {icon}
      {label}
    </button>
  );
}
