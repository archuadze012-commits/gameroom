"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type Tab = {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number | string;
};

type Props = {
  tabs: Tab[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  sticky?: boolean;
  /** Top offset for sticky positioning (in px). */
  stickyTop?: number;
};

export function TabBar({ tabs, value, onChange, className, sticky = true, stickyTop = 64 }: Props) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = React.useState<{ left: number; width: number }>({ left: 0, width: 0 });

  React.useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLButtonElement>(`[data-tab-id="${value}"]`);
    if (!active) return;
    const listRect = list.getBoundingClientRect();
    const r = active.getBoundingClientRect();
    setIndicator({ left: r.left - listRect.left + list.scrollLeft, width: r.width });
  }, [value, tabs]);

  return (
    <div
      role="tablist"
      aria-label="Section tabs"
      className={cn(
        "relative z-30 -mx-4 border-y border-[var(--gr-border)] bg-[var(--gr-bg-base)]/85 px-4 backdrop-blur-md",
        sticky && "sticky",
        className
      )}
      style={sticky ? { top: stickyTop } : undefined}
    >
      <div ref={listRef} className="relative flex gap-1 overflow-x-auto scrollbar-hide">
        {tabs.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              role="tab"
              data-tab-id={t.id}
              aria-selected={active}
              onClick={() => onChange(t.id)}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 px-3.5 py-3 text-[13.5px] font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gr-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--gr-bg-base)] rounded-md",
                active ? "text-white" : "text-[var(--gr-text-mute)] hover:text-[var(--gr-text)]"
              )}
            >
              {t.icon && <span className="shrink-0">{t.icon}</span>}
              <span>{t.label}</span>
              {t.count != null && (
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 py-[1px] text-[10.5px] tabular-nums",
                    active
                      ? "bg-[var(--gr-accent)]/15 text-[var(--gr-accent)]"
                      : "bg-white/[0.05] text-[var(--gr-text-dim)]"
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 h-[2px] rounded-full bg-[var(--gr-accent)] transition-all duration-200 motion-reduce:transition-none"
          style={{ left: indicator.left, width: indicator.width }}
        />
      </div>
    </div>
  );
}
