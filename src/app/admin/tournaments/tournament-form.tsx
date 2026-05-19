"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockGames } from "@/lib/mock-data";
import { GameIcon } from "@/components/game-icon";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
}

export function TournamentForm({ onClose }: Props) {
  const [name, setName] = useState("");
  const [gameSlug, setGameSlug] = useState(mockGames[0].slug);
  const [format, setFormat] = useState<"Single Elimination" | "Double Elimination" | "Round Robin">("Single Elimination");
  const [maxParticipants, setMaxParticipants] = useState("8");
  const [prizePool, setPrizePool] = useState("");
  const [startsAt, setStartsAt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("სახელი სავალდებულოა."); return; }
    toast.success(`"${name}" ჩემპიონატი შეიქმნა!`, {
      description: `${format} · ${maxParticipants} მონაწილე`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <h2 className="font-semibold">ახალი ჩემპიონატი</h2>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-secondary/60">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>სახელი</Label>
            <Input placeholder="მაგ. Georgia PUBG Cup 2026" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* Game */}
          <div className="space-y-1.5">
            <Label>თამაში</Label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {mockGames.map((g) => (
                <button
                  key={g.slug}
                  type="button"
                  onClick={() => setGameSlug(g.slug)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    gameSlug === g.slug
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 hover:border-border hover:bg-secondary/40"
                  }`}
                >
                  <GameIcon game={g} size="sm" />
                  <span className="truncate">{g.nameKa}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="space-y-1.5">
            <Label>ფორმატი</Label>
            <div className="flex gap-2">
              {(["Single Elimination", "Double Elimination", "Round Robin"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs transition-colors ${
                    format === f
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Participants + Prize */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>მაქს. მონაწილე</Label>
              <select
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
              >
                {[4, 8, 16, 32, 64].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>პრიზი (GEL)</Label>
              <Input placeholder="მაგ. 2,000 GEL" value={prizePool} onChange={(e) => setPrizePool(e.target.value)} />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>დაწყების დრო</Label>
            <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>გაუქმება</Button>
            <Button type="submit">
              <Check className="mr-1.5 h-4 w-4" /> შექმნა
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
