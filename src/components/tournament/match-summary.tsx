"use client";

import { useState } from "react";
import { Sparkles, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Match = { player1?: { name: string } | null; player2?: { name: string } | null; score1?: number; score2?: number; winner?: { name: string } | null; status?: string };

type Props = { tournamentName: string; game: string; matches: Match[] };

export function MatchSummary({ tournamentName, game, matches }: Props) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const completedMatches = matches
        .filter((m) => m.winner && m.player1 && m.player2)
        .map((m) => ({
          player1: m.player1!.name,
          player2: m.player2!.name,
          score1: m.score1 ?? 0,
          score2: m.score2 ?? 0,
          winner: m.winner!.name,
        }));

      const res = await fetch("/api/tournament-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentName, game, matches: completedMatches }),
      });
      const data = await res.json();
      if (data.summary) setSummary(data.summary);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      {!summary ? (
        <Button onClick={generate} disabled={loading} variant="outline" className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          AI რეზიუმე
        </Button>
      ) : (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
              <BookOpen className="h-4 w-4" /> AI რეზიუმე
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
            <button onClick={() => setSummary("")} className="text-xs text-muted-foreground hover:text-foreground">
              გასუფთავება
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
