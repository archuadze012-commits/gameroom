"use client";

import * as React from "react";
import { Search } from "lucide-react";

export function ForumSearch() {
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gr-text-mute)]" />
      <input
        ref={ref}
        type="search"
        placeholder="მოძებნე თემა, ავტორი ან ტეგი"
        className="h-11 w-full border border-[var(--gr-border)] bg-[var(--gr-bg-1)] pl-10 pr-16 text-[14px] text-[var(--gr-text)] placeholder:text-[var(--gr-text-dim)] focus:border-[var(--gr-violet-hi)] focus:outline-none"
      />
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 border border-[var(--gr-border-hi)] bg-[var(--gr-bg-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--gr-text-mute)]">
        ⌘K
      </kbd>
    </div>
  );
}
