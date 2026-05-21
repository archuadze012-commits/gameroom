"use client";

import React, { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { mockGames } from "@/lib/mock-data";
import { GameIcon } from "@/components/game-icon";

const regions = ["GE", "EU", "RU", "MENA"];

export function LfgFilters({ favoriteSlugs = [] }: { favoriteSlugs?: string[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const games =
    favoriteSlugs.length > 0
      ? mockGames.filter((g) => favoriteSlugs.includes(g.slug))
      : mockGames;

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
    <div className="rounded-lg border border-border/60 bg-card/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="h-4 w-4" /> ფილტრები
        </h2>
        {hasActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/lfg")}
            className="h-7 px-2 text-xs"
          >
            <X className="mr-1 h-3 w-3" /> გასუფთავება
          </Button>
        )}
      </div>

      <div className="space-y-5">
        <FilterGroup label="თამაში">
          {[...games].sort((a, b) => b.favoritedBy - a.favoritedBy).map((g) => (
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

<FilterGroup label="დამატებითი">
          <FilterButton
            label="🎙 მხოლოდ voice-ით"
            active={params.get("voice") === "1"}
            onClick={() =>
              update("voice", params.get("voice") === "1" ? null : "1")
            }
          />
        </FilterGroup>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
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
      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors ${
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border bg-background/40 text-muted-foreground hover:border-border/80 hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
