"use client";

import { useState, useEffect } from "react";

const REACTIONS = [
  {
    key: "heart",
    label: "❤️",
    sub: "Heart",
    active: "border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/15 hover:text-rose-300",
  },
  {
    key: "gg",
    label: "GG",
    sub: "Good Game",
    active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300",
  },
  {
    key: "pro",
    label: "PRO",
    sub: "Pro Gamer",
    active: "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/15 hover:text-blue-300",
  },
  {
    key: "noob",
    label: "NOOB",
    sub: "Beginner",
    active: "border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/15 hover:text-violet-300",
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
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D0F8FF]/72">React</p>
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
                group relative flex items-center gap-1.5 rounded-full border px-3 py-1
                text-[10px] font-bold uppercase tracking-wider transition-all duration-200
                disabled:cursor-not-allowed disabled:opacity-60
                ${active 
                  ? r.active 
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                }
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
                  rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none
                  ${active ? "bg-current/20 text-current" : "bg-white/10 text-white/60"}
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
