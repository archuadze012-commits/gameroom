import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  /** Used to associate the section element with the heading (aria-labelledby). */
  id?: string;
};

export function SectionHeader({ title, description, actions, className, id }: Props) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-[20px] font-bold leading-tight tracking-[-0.01em] text-[var(--gr-text)] sm:text-[22px]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-[13px] text-[var(--gr-text-mute)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
