"use client";

import { useState } from "react";

const REACTIONS = [
  { emoji: "🎮", label: "კლასი" },
  { emoji: "🔥", label: "ცეცხლი" },
  { emoji: "💀", label: "GG" },
  { emoji: "🏆", label: "მოგება" },
  { emoji: "⚡", label: "კლაჩი" },
  { emoji: "🎯", label: "ზუსტი" },
];

type Props = {
  postId: string;
  initialCounts: Record<string, number>;
  initialMine: string[];
};

export function PostReactions({ postId, initialCounts, initialMine }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [mine, setMine] = useState<Set<string>>(new Set(initialMine));
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(emoji: string) {
    if (pending) return;
    const had = mine.has(emoji);
    setPending(emoji);
    setMine((prev) => {
      const next = new Set(prev);
      had ? next.delete(emoji) : next.add(emoji);
      return next;
    });
    setCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + (had ? -1 : 1) }));
    try {
      const res = await fetch(`/api/posts/${postId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setMine((prev) => {
        const next = new Set(prev);
        had ? next.add(emoji) : next.delete(emoji);
        return next;
      });
      setCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + (had ? 1 : -1) }));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {REACTIONS.map(({ emoji, label }) => {
        const count = counts[emoji] ?? 0;
        const active = mine.has(emoji);
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            title={label}
            className={`group flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-all
              ${active
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
              } ${pending === emoji ? "opacity-60" : ""}`}
          >
            <span className="text-base leading-none">{emoji}</span>
            {count > 0 && <span className="text-xs font-medium">{count}</span>}
            <span className="hidden text-[10px] group-hover:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
