"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2, GitBranch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockGames, mockTournaments, type MockTournament } from "@/lib/mock-data";
import { GameIcon } from "@/components/game-icon";
import { BracketDraw } from "./bracket-draw";
import { TournamentForm } from "./tournament-form";

const statusLabel = {
  open: "open",
  checkin: "checkin",
  live: "live",
  completed: "completed",
};

export default function AdminTournamentsPage() {
  const [bracketTournament, setBracketTournament] = useState<MockTournament | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">ჩემპიონატები</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-1 h-4 w-4" /> ახალი ჩემპიონატი
        </Button>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">სახელი</th>
                <th className="px-4 py-3 text-left">თამაში</th>
                <th className="px-4 py-3 text-left">ფორმატი</th>
                <th className="px-4 py-3 text-left">სტატუსი</th>
                <th className="px-4 py-3 text-left">მონაწილე</th>
                <th className="px-4 py-3 text-right">მოქმედება</th>
              </tr>
            </thead>
            <tbody>
              {mockTournaments.map((t) => {
                const game = mockGames.find((g) => g.slug === t.gameSlug);
                return (
                  <tr key={t.slug} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/tournaments/${t.slug}`} className="hover:text-primary">
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {game && <GameIcon game={game} size="lg" />}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.format}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{statusLabel[t.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.participants.current}/{t.participants.max}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mr-1 text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={() => setBracketTournament(t)}
                        title="კენჭისყრა / Bracket"
                      >
                        <GitBranch className="mr-1 h-4 w-4" /> კენჭისყრა
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {bracketTournament && (
        <BracketDraw
          tournament={bracketTournament}
          onClose={() => setBracketTournament(null)}
        />
      )}
      {showForm && <TournamentForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
