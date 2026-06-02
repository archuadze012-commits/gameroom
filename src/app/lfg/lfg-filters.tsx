"use client";

import React, { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X, Radio } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { mockGames } from "@/lib/mock-data";
import { GameIcon } from "@/components/game-icon";
import { GamerCard } from "@/components/ui/gamer-card";

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
    <GamerCard clipSize={14} sideGlow={false} className="overflow-hidden">
      <div className="space-y-5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p
              className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: "rgb(103,232,249)", textShadow: "0 0 6px rgba(34,211,238,0.6)" }}
            >
              live filters
            </p>
            <h2
              className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em]"
              style={{ color: "#ffffff", textShadow: "0 0 5px rgba(196,30,58,0.32)" }}
            >
              <Filter className="h-4 w-4 text-[rgba(255,110,120,0.95)]" /> ფილტრები
            </h2>
          </div>
          {hasActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/lfg")}
              className="h-8 rounded-full border border-[rgba(196,30,58,0.34)] bg-[rgba(196,30,58,0.08)] px-3 text-[11px] uppercase tracking-[0.12em] text-white shadow-[0_0_18px_rgba(196,30,58,0.08)] hover:border-[rgba(196,30,58,0.55)] hover:bg-[rgba(196,30,58,0.14)] hover:text-white"
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
                onClick={() => update("game", g.slug)}
              />
            ))}
            <FilterButton
              label="ყველა"
              active={!params.get("game")}
              onClick={() => update("game", null)}
            />
          </FilterGroup>

          <FilterGroup label="რეგიონი">
            {regions.map((region) => (
              <FilterButton
                key={region}
                label={region}
                active={params.get("region") === region}
                onClick={() => update("region", params.get("region") === region ? null : region)}
              />
            ))}
          </FilterGroup>

          <FilterGroup label="დამატებითი">
            <FilterButton
              icon={<Radio className="h-3.5 w-3.5" />}
              label="მხოლოდ voice-ით"
              active={params.get("voice") === "1"}
              onClick={() =>
                update("voice", params.get("voice") === "1" ? null : "1")
              }
            />
          </FilterGroup>
        </div>
      </div>
    </GamerCard>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label
        className="text-xs uppercase tracking-wider"
        style={{ color: "rgba(255,255,255,0.62)", textShadow: "0 0 4px rgba(196,30,58,0.2)" }}
      >
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
}: {
  icon?: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
        active
          ? "border-[rgba(196,30,58,0.68)] bg-[rgba(196,30,58,0.14)] text-white shadow-[0_0_16px_rgba(196,30,58,0.12)]"
          : "border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] text-white/70 hover:border-[rgba(34,211,238,0.4)] hover:text-white"
      }`}
      style={active ? { textShadow: "0 0 4px rgba(196,30,58,0.3)" } : { textShadow: "0 0 3px rgba(196,30,58,0.18)" }}
    >
      {icon}
      {label}
    </button>
  );
}
