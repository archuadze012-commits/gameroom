"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Suggestion = { id: string; title: string; rank: string | null; reason: string };

type Props = { postId: string; gameSlug: string; title: string; description?: string };

export function TeammateSuggestions({ postId, gameSlug, title, description }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/lfg/suggest-mates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, gameSlug, title, description }),
        });
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
      } catch {}
      setLoading(false);
    })();
  }, [postId, gameSlug, title, description]);

  if (!loading && suggestions.length === 0) return null;

  return (
    <Card className="border-border/60">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          AI-ის რეკომენდაცია
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> ვანალიზებ...
          </div>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s) => (
              <Link key={s.id} href={`/lfg/${s.id}`}>
                <div className="rounded-lg border border-border/50 p-3 hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-tight">{s.title}</p>
                    {s.rank && <Badge variant="outline" className="shrink-0 text-[10px]">🏅 {s.rank}</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-2.5 w-2.5" /> {s.reason}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
