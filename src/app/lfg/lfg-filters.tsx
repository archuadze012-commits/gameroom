"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Filter, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { mockGames } from "@/lib/mock-data";

const regions = ["GE", "EU", "RU", "MENA"];

export function LfgFilters() {
  const router = useRouter();
  const params = useSearchParams();

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
          <FilterButton
            label="ყველა"
            active={!params.get("game")}
            onClick={() => update("game", null)}
          />
          {mockGames.map((g) => (
            <FilterButton
              key={g.slug}
              label={`${g.emoji} ${g.nameKa}`}
              active={params.get("game") === g.slug}
              onClick={() => update("game", g.slug)}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="რეგიონი">
          <FilterButton
            label="ყველა"
            active={!params.get("region")}
            onClick={() => update("region", null)}
          />
          {regions.map((r) => (
            <FilterButton
              key={r}
              label={r}
              active={params.get("region") === r}
              onClick={() => update("region", r)}
            />
          ))}
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
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border bg-background/40 text-muted-foreground hover:border-border/80 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
