"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all",     label: "ყველა" },
  { id: "open",    label: "ღია" },
  { id: "solved",  label: "მოგვარებული" },
  { id: "hot",     label: "ცხელი" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export function ForumTabs() {
  const [active, setActive] = React.useState<FilterId>("all");
  return (
    <div
      role="tablist"
      aria-label="Forum filters"
      className="flex flex-wrap gap-1 border-b border-[var(--gr-border)]"
    >
      {FILTERS.map((f) => {
        const isActive = active === f.id;
        return (
          <button
            key={f.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => setActive(f.id)}
            className={cn(
              "relative px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gr-violet-hi)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--gr-bg-0)]",
              isActive ? "text-[var(--gr-text)]" : "text-[var(--gr-text-mute)] hover:text-[var(--gr-text)]"
            )}
          >
            {f.label}
            {isActive && (
              <span
                aria-hidden
                className="absolute inset-x-2 -bottom-px h-[2px] bg-[var(--gr-violet)] shadow-[0_0_12px_rgba(139,92,246,0.7)]"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
