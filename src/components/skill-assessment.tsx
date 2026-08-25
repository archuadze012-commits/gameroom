"use client";

import { useState } from "react";
import { Sparkles, Loader2, Trophy, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIER_COLORS: Record<string, string> = {
  Bronze: "text-amber-700 border-amber-700/40 bg-amber-700/10",
  Silver: "text-slate-400 border-slate-400/40 bg-slate-400/10",
  Gold: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  Platinum: "text-cyan-400 border-cyan-400/40 bg-cyan-400/10",
  Diamond: "text-blue-400 border-blue-400/40 bg-blue-400/10",
  Master: "text-purple-400 border-purple-400/40 bg-purple-400/10",
  Grandmaster: "text-red-400 border-red-400/40 bg-red-400/10",
};

type Game = { slug: string; nameKa: string; emoji: string };
type Result = { tier: string; analysis: string; tips: string[] };

export function SkillAssessment({ games }: { games: Game[] }) {
  const [gameSlug, setGameSlug] = useState(games[0]?.slug ?? "");
  const [rank, setRank] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const selectedGame = games.find((g) => g.slug === gameSlug);

  const assess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameSlug) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/skill-assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: selectedGame?.nameKa ?? gameSlug,
          rank,
          description,
        }),
      });
      const data = await res.json();
      if (data.tier) setResult(data);
    } catch {}
    setLoading(false);
  };

  const tierColor = result
    ? (TIER_COLORS[result.tier] ?? "text-primary border-primary/40 bg-primary/10")
    : "";

  return (
    <div className="pubg-loadout-card relative overflow-hidden p-6 sm:p-8">
      <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
      <span
        aria-hidden
        className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5]"
        style={{
          background: "#3b82f6",
          boxShadow: "0 0 10px rgba(59, 130, 246, 0.8)"
        }}
      />
      <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-25 z-[5]" />

      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Trophy className="h-4 w-4 text-primary" />
          AI Skill Assessment
        </div>

        <form onSubmit={assess} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">თამაში *</Label>
              <div className="relative">
                <Select
                  value={gameSlug}
                  onValueChange={(val) => setGameSlug(val ?? "")}
                >
                  <SelectTrigger className="!h-10 !w-full bg-black/40 border-white/10 rounded-lg text-white">
                    <SelectValue placeholder="აირჩიე თამაში" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b0111] border border-white/5 text-white">
                    {games.map((g) => (
                      <SelectItem key={g.slug} value={g.slug}>
                        {g.emoji} {g.nameKa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">მიმდინარე რანკი</Label>
              <Input
                placeholder="მაგ. Crown II, Gold Nova"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className="h-10 bg-black/40 border-white/10 focus-visible:border-violet-500 focus-visible:ring-violet-500/20 text-white rounded-lg"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">დამატებითი ინფო (სტილი, გამოცდილება)</Label>
            <Textarea
              rows={2}
              placeholder="მაგ. 500+ საათი, ვამჯობინებ aggressive სტილს..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[64px] bg-black/40 border-white/10 focus-visible:border-violet-500 focus-visible:ring-violet-500/20 text-white rounded-lg py-2 px-3 leading-relaxed resize-none"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={!gameSlug || loading}
            className="gap-1.5"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            შეფასება
          </Button>
        </form>

        {result && (
          <div className="space-y-3 border-t border-border/60 pt-3">
            <div className="flex items-center gap-2">
              <Badge className={`border px-3 py-1 text-sm font-bold ${tierColor}`}>
                {result.tier}
              </Badge>
              <span className="text-xs text-muted-foreground">AI-ის შეფასება</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {result.analysis}
            </p>
            <div className="space-y-1.5">
              <p className="text-xs font-medium">გაუმჯობესების რჩევები:</p>
              {result.tips.map((tip, i) => (
                <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="shrink-0 font-bold text-primary">{i + 1}.</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
