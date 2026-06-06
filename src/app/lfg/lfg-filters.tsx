"use client";

import React, { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X, Radio } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { mockGames } from "@/lib/mock-data";
import { GameIcon } from "@/components/game-icon";

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
        className={`relative z-10 w-full rounded-[20px] bg-[#0a0714]/5 border border-white/5 transition-all duration-500 group-hover:bg-[#0a0714]/10 ${glowVariant === 'tight' ? 'premium-card-glow-tight' : 'premium-card-glow'} ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

const regions = ["GE", "EU", "RU", "MENA"];

export function LfgFilters({ favoriteSlugs = [] }: { favoriteSlugs?: string[] }) {
  const router = useRouter();
  const params = useSearchParams();

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
    <PremiumCard noHover className="p-4 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]">
            live filters
          </p>
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
            <Filter className="h-4 w-4 text-cyan-400" /> ფილტრები
          </h2>
        </div>
        {hasActive ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/lfg")}
            className="h-8 rounded-full border border-pink-500/30 bg-pink-500/5 px-3 text-[11px] uppercase tracking-[0.12em] text-pink-400 hover:bg-pink-500/10 hover:text-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.15)] transition-all"
          >
            <X className="mr-1 h-3 w-3" /> გასუფთავება
          </Button>
        ) : null}
      </div>

      <div className="space-y-5">
        <FilterGroup label="თამაში">
          {games.map((g) => (
            <FilterButton
              key={g.slug}
              icon={<GameIcon game={g} size="sm" />}
              label={g.nameKa}
              active={params.get("game") === g.slug}
              variant="cyan"
              onClick={() => update("game", g.slug)}
            />
          ))}
          <FilterButton
            label="ყველა"
            active={!params.get("game")}
            variant="cyan"
            onClick={() => update("game", null)}
          />
        </FilterGroup>

        <FilterGroup label="რეგიონი">
          {regions.map((region) => (
            <FilterButton
              key={region}
              label={region}
              active={params.get("region") === region}
              variant="violet"
              onClick={() => update("region", params.get("region") === region ? null : region)}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="დამატებითი">
          <FilterButton
            icon={<Radio className="h-3.5 w-3.5" />}
            label="მხოლოდ voice-ით"
            active={params.get("voice") === "1"}
            variant="pink"
            onClick={() =>
              update("voice", params.get("voice") === "1" ? null : "1")
            }
          />
        </FilterGroup>
      </div>
    </PremiumCard>
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
