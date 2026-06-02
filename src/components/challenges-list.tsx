"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Zap, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  target_count: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
};

export function ChallengesList({ hasSession }: { hasSession: boolean }) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/challenges/today")
      .then((r) => r.json())
      .then((data: Challenge[]) => { if (Array.isArray(data)) setChallenges(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function claim(id: string, xp: number) {
    setClaiming(id);
    try {
      const res = await fetch(`/api/challenges/${id}/claim`, { method: "POST" });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        toast.error(j.error ?? "შეცდომა");
        return;
      }
      setChallenges((prev) => prev.map((c) => c.id === id ? { ...c, claimed: true, completed: true } : c));
      toast.success(`+${xp} XP მიღებულია!`);
    } catch {
      toast.error("შეცდომა — სცადე თავიდან");
    } finally {
      setClaiming(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[20px] bg-white/5 border border-white/5" />
        ))}
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-[24px] border border-white/5 bg-white/5 py-20 text-center backdrop-blur-md">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pink-500/10 shadow-[0_0_30px_rgba(236,72,153,0.2)]">
          <Trophy className="h-8 w-8 text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
        </div>
        <p className="text-[14px] font-bold uppercase tracking-widest text-white/50">
          დღევანდელი challenges ჯერ არ არის დამატებული.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {challenges.map((c) => {
        const isClaimed = c.claimed;
        return (
          <li
            key={c.id}
            className={`group relative flex items-center gap-5 overflow-hidden rounded-[20px] p-[1.5px] transition-all duration-300 hover:-translate-y-1 ${
              isClaimed
                ? "bg-gradient-to-br from-cyan-500/30 to-blue-500/30 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                : "bg-white/5 border border-white/5 hover:border-pink-500/30 hover:bg-gradient-to-br hover:from-pink-500/30 hover:to-violet-500/30 hover:shadow-[0_0_20px_rgba(236,72,153,0.2)]"
            }`}
          >
            <div className={`relative flex w-full items-center gap-5 rounded-[18.5px] bg-[#0a0714] p-5 sm:p-6 backdrop-blur-md ${isClaimed ? "bg-[#0a0714]/80" : ""}`}>
              
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
                isClaimed 
                  ? "border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.3)]" 
                  : "border-pink-500/40 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.3)] group-hover:scale-110 transition-transform"
              }`}>
                {isClaimed ? (
                  <CheckCircle2 className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                ) : (
                  <Zap className="h-6 w-6 text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className={`font-display text-[18px] font-black uppercase tracking-tight transition-colors ${
                  isClaimed ? "text-white/40 line-through" : "text-white drop-shadow-sm group-hover:text-pink-400"
                }`}>
                  {c.title}
                </p>
                {c.description && (
                  <p className={`mt-1.5 text-[13px] font-medium leading-relaxed ${isClaimed ? "text-white/30" : "text-white/50"}`}>
                    {c.description}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-3 sm:flex-row sm:items-center sm:gap-5">
                <div className={`flex flex-col items-end sm:items-start ${isClaimed ? "opacity-50" : ""}`}>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Reward</span>
                  <span className="font-display text-[18px] font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                    +{c.xp_reward} XP
                  </span>
                </div>
                
                {hasSession && !isClaimed && (
                  <Button
                    size="sm"
                    onClick={() => void claim(c.id, c.xp_reward)}
                    disabled={claiming === c.id}
                    className="h-10 rounded-full border border-pink-500/40 bg-[linear-gradient(135deg,#ec4899,#8b5cf6)] px-6 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] disabled:opacity-50"
                  >
                    {claiming === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim"}
                  </Button>
                )}
                {isClaimed && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-400">
                    <CheckCircle2 className="h-3 w-3" /> დასრულდა
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
