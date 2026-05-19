"use client";

import { useState, useCallback } from "react";
import { Shuffle, X, Trophy, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MockTournament } from "@/lib/mock-data";

// Mock participant pools per tournament
const PARTICIPANTS: Record<string, string[]> = {
  "ge-cup-efootball-2026": [
    "GeoSniper","Lasha10","El_Pippo","Nika","Vakho","Beka","Tamo","Giorgi",
    "Saba","ZeroKD","Sage_Tbilisi","Lika","archuadze012","Nodo","Daviti","Kote",
  ],
  "tbilisi-pubg-night": [
    "GeoSniper","Saba","ZeroKD","Vakho","Beka","Nika","Giorgi","Lasha10",
    "Tamo","Lika","archuadze012","El_Pippo","Kote","Daviti","Nodo","Sage_Tbilisi",
  ],
  "valorant-spring-clash": [
    "Sage_Tbilisi","Lika","archuadze012","Nika","Giorgi","Beka","Vakho","ZeroKD",
  ],
  "warzone-resurgence-may": [
    "ZeroKD","GeoSniper","Vakho","Beka","Tamo","Giorgi","Saba","Lasha10",
  ],
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build knockout rounds from a flat participants list
function buildBracket(players: string[]): string[][][] {
  // pad to power of 2
  const size = Math.pow(2, Math.ceil(Math.log2(players.length)));
  const padded = [...players, ...Array(size - players.length).fill("BYE")];
  const rounds: string[][][] = [];
  let current = padded;
  while (current.length > 1) {
    const matches: string[][] = [];
    for (let i = 0; i < current.length; i += 2) {
      matches.push([current[i], current[i + 1]]);
    }
    rounds.push(matches);
    // winners placeholder (TBD)
    current = matches.map(() => "TBD");
  }
  return rounds;
}

interface Props {
  tournament: MockTournament;
  onClose: () => void;
}

export function BracketDraw({ tournament, onClose }: Props) {
  const pool = PARTICIPANTS[tournament.slug] ?? PARTICIPANTS["valorant-spring-clash"];
  const count = Math.min(tournament.participants.max, pool.length);
  const initial = pool.slice(0, count);

  const [players, setPlayers] = useState<string[]>(initial);
  const [shuffled, setShuffled] = useState(false);

  const handleShuffle = useCallback(() => {
    setPlayers(shuffle(players));
    setShuffled(true);
  }, [players]);

  const rounds = buildBracket(players);
  const roundNames = ["მე-1 რაუნდი", "მეოთხედფინალი", "ნახევარფინალი", "ფინალი"];
  const labelFor = (i: number, total: number) => {
    const fromEnd = total - 1 - i;
    return roundNames[fromEnd] ?? `რაუნდი ${i + 1}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-5xl max-h-[90vh] flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold">{tournament.name}</h2>
              <p className="text-xs text-muted-foreground">Single Elimination · {players.length} მონაწილე</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleShuffle} size="sm" variant={shuffled ? "outline" : "default"}>
              <Shuffle className="mr-1.5 h-4 w-4" />
              {shuffled ? "ხელახლა კენჭისყრა" : "კენჭისყრა"}
            </Button>
            <button onClick={onClose} className="rounded-md p-1.5 hover:bg-secondary/60">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bracket */}
        <div className="overflow-auto flex-1 p-6">
          {!shuffled ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <Shuffle className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">დააჭირე <strong>კენჭისყრა</strong>-ს, რომ მონაწილეები შეარჩიო</p>
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {players.map((p) => (
                  <Badge key={p} variant="secondary">{p}</Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-0 min-w-max">
              {rounds.map((round, ri) => (
                <div key={ri} className="flex flex-col">
                  {/* Round label */}
                  <div className="mb-3 px-3 text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {labelFor(ri, rounds.length)}
                    </span>
                  </div>

                  {/* Matches */}
                  <div
                    className="flex flex-col justify-around"
                    style={{ gap: `${Math.pow(2, ri) * 8}px` }}
                  >
                    {round.map((match, mi) => (
                      <div key={mi} className="flex items-center gap-1">
                        {/* Match card */}
                        <div className="w-36 rounded-lg border border-border/60 bg-secondary/20 overflow-hidden">
                          {match.map((player, pi) => (
                            <div
                              key={pi}
                              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium ${
                                pi === 0
                                  ? "border-b border-border/40"
                                  : ""
                              } ${
                                player === "BYE"
                                  ? "text-muted-foreground/40 italic"
                                  : player === "TBD"
                                  ? "text-muted-foreground/50"
                                  : player === "archuadze012"
                                  ? "text-rose-400"
                                  : "text-foreground"
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0 opacity-60" />
                              <span className="truncate">{player === "TBD" ? "—" : player}</span>
                            </div>
                          ))}
                        </div>

                        {/* Connector arrow (not on last round) */}
                        {ri < rounds.length - 1 && (
                          <ChevronRight className="h-3 w-3 text-border shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Champion placeholder */}
              <div className="flex flex-col items-center justify-center pl-2">
                <div className="mb-3 px-3 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">
                    ჩემპიონი
                  </span>
                </div>
                <div className="flex items-center justify-center h-10 w-36 rounded-lg border border-amber-500/40 bg-amber-500/10">
                  <Trophy className="mr-1.5 h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs text-amber-400 font-medium">TBD</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {shuffled && (
          <div className="border-t border-border/60 px-6 py-3 shrink-0 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {rounds[0].length} მატჩი · {rounds.length} რაუნდი
            </p>
            <Button size="sm">
              <Trophy className="mr-1.5 h-4 w-4" /> ჩემპიონატის დაწყება
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
