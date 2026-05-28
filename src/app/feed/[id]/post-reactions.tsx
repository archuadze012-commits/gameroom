"use client";

import { useState, useEffect } from "react";

const REACTIONS = [
  {
    key: "heart",
    label: "❤️",
    sub: "Heart",
    base: "border-rose-500/30 text-rose-400 bg-rose-500/5 hover:border-rose-400/60 hover:bg-rose-500/15 hover:shadow-rose-500/20",
    active: "border-rose-400 bg-rose-500/25 text-rose-300 shadow-rose-500/30",
  },
  {
    key: "gg",
    label: "GG",
    sub: "Good Game",
    base: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:border-emerald-400/60 hover:bg-emerald-500/15 hover:shadow-emerald-500/20",
    active: "border-emerald-400 bg-emerald-500/25 text-emerald-300 shadow-emerald-500/30",
  },
  {
    key: "pro",
    label: "PRO",
    sub: "Pro Gamer",
    base: "border-blue-500/30 text-blue-400 bg-blue-500/5 hover:border-blue-400/60 hover:bg-blue-500/15 hover:shadow-blue-500/20",
    active: "border-blue-400 bg-blue-500/25 text-blue-300 shadow-blue-500/30",
  },
  {
    key: "noob",
    label: "Noob",
    sub: "Beginner",
    base: "border-violet-500/30 text-violet-400 bg-violet-500/5 hover:border-violet-400/60 hover:bg-violet-500/15 hover:shadow-violet-500/20",
    active: "border-violet-400 bg-violet-500/25 text-violet-300 shadow-violet-500/30",
  },
] as const;

type ReactionKey = (typeof REACTIONS)[number]["key"];

type Props = {
  postId: string;
  initialCounts?: Record<string, number>;
  initialMine?: string[];
  hideHeading?: boolean;
};

export function PostReactions({ postId, initialCounts, initialMine, hideHeading = false }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts ?? {});
  const [mine, setMine] = useState<Set<string>>(new Set(initialMine ?? []));
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!initialCounts) {
      let active = true;
      fetch(`/api/posts/${postId}/reactions`)
        .then((res) => res.json())
        .then((data) => {
          if (active && data) {
            setCounts(data.counts ?? {});
            setMine(new Set(data.mine ?? []));
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }
  }, [postId, initialCounts]);

  async function toggle(key: ReactionKey) {
    if (pending) return;
    const had = mine.has(key);
    setPending(key);
    setMine((prev) => { const n = new Set(prev); had ? n.delete(key) : n.add(key); return n; });
    setCounts((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 0) + (had ? -1 : 1)) }));
    try {
      const res = await fetch(`/api/posts/${postId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji: key }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setMine((prev) => { const n = new Set(prev); had ? n.add(key) : n.delete(key); return n; });
      setCounts((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 0) + (had ? 1 : -1)) }));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      {!hideHeading && (
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">React</p>
      )}
      <div className="flex flex-wrap gap-2">
        {REACTIONS.map((r) => {
          const active = mine.has(r.key);
          const count = counts[r.key] ?? 0;
          const isPending = pending === r.key;
          return (
            <button
              key={r.key}
              onClick={() => toggle(r.key)}
              disabled={!!pending}
              title={r.sub}
              className={`
                group relative flex items-center gap-2 rounded-lg border px-3 py-1.5
                text-xs font-bold uppercase tracking-wide
                shadow-sm transition-all duration-200
                hover:shadow-md hover:-translate-y-px active:translate-y-0
                disabled:cursor-not-allowed disabled:opacity-60
                ${active ? r.active + " shadow-md" : r.base}
              `}
            >
              {/* active dot */}
              {active && (
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
              )}
              <span className={`transition-transform duration-150 ${isPending ? "scale-95" : ""}`}>
                {r.label}
              </span>
              {count > 0 && (
                <span className={`
                  rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none
                  ${active ? "bg-current/20 text-current" : "bg-muted text-muted-foreground"}
                `}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
