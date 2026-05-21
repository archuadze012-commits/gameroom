"use client";

import { useState } from "react";
import { Sparkles, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TIER_COLORS: Record<string, string> = {
  Bronze: "text-amber-700 border-amber-700/40 bg-amber-700/10",
  Silver: "text-slate-400 border-slate-400/40 bg-slate-400/10",
  Gold: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  Platinum: "text-cyan-400 border-cyan-400/40 bg-cyan-400/10",
  Diamond: "text-blue-400 border-blue-400/40 bg-blue-400/10",
  Master: "text-purple-400 border-purple-400/40 bg-purple-400/10",
  Grandmaster: "text-red-400 border-red-400/40 bg-red-400/10",
};

type Result = { tier: string; analysis: string; tips: string[] };

export function SkillAssessment() {
  const [game, setGame] = useState("");
  const [rank, setRank] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const assess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!game.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/skill-assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game, rank, description }),
      });
      const data = await res.json();
      if (data.tier) setResult(data);
    } catch {}
    setLoading(false);
  };

  const tierColor = result ? (TIER_COLORS[result.tier] ?? "text-primary border-primary/40 bg-primary/10") : "";

  return (
    <Card className="border-border/60">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Trophy className="h-4 w-4 text-primary" />
          AI Skill Assessment
        </div>

        <form onSubmit={assess} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">თამაში *</Label>
              <Input
                placeholder="მაგ. PUBG Mobile, CS2"
                value={game}
                onChange={(e) => setGame(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">მიმდინარე რანკი</Label>
              <Input
                placeholder="მაგ. Crown II, Gold Nova"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className="h-8 text-sm"
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
              className="text-sm resize-none"
            />
          </div>
          <Button type="submit" size="sm" disabled={!game.trim() || loading} className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            შეფასება
          </Button>
        </form>

        {result && (
          <div className="space-y-3 border-t border-border/60 pt-3">
            <div className="flex items-center gap-2">
              <Badge className={`text-sm font-bold px-3 py-1 border ${tierColor}`}>
                {result.tier}
              </Badge>
              <span className="text-xs text-muted-foreground">AI-ის შეფასება</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.analysis}</p>
            <div className="space-y-1.5">
              <p className="text-xs font-medium">გაუმჯობესების რჩევები:</p>
              {result.tips.map((tip, i) => (
                <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
