"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GameIcon } from "@/components/game-icon";
import type { MockTournament } from "@/lib/mock-data";
import { BracketDraw } from "./bracket-draw";
import { TournamentForm } from "./tournament-form";
import { deleteTournamentAction } from "./actions";

export type AdminTournamentRow = {
  id: string;
  name: string;
  slug: string;
  format: string;
  status: string;
  maxParticipants: number;
  prizePool: string | null;
  startsAt: string | null;
  participantCount: number;
  gameSlug: string;
  gameNameKa: string;
  gameEmoji: string;
  gameIconUrl: string | null;
};

export type GameOption = { id: string; slug: string; nameKa: string; emoji: string; iconUrl: string | null };

const FORMAT_LABEL: Record<string, string> = {
  single_elim: "Single Elimination",
  double_elim: "Double Elimination",
  round_robin: "Round Robin",
};

function toBracketShape(t: AdminTournamentRow): MockTournament {
  const status = (["open", "checkin", "live", "completed"].includes(t.status) ? t.status : "open") as MockTournament["status"];
  return {
    slug: t.slug,
    name: t.name,
    gameSlug: t.gameSlug,
    format: (FORMAT_LABEL[t.format] ?? "Single Elimination") as MockTournament["format"],
    status,
    prizePool: t.prizePool ?? "",
    participants: { current: t.participantCount, max: t.maxParticipants },
    startsAt: t.startsAt ?? "",
    banner: "",
  };
}

export function AdminTournamentsClient({ tournaments, games }: { tournaments: AdminTournamentRow[]; games: GameOption[] }) {
  const router = useRouter();
  const [bracketTournament, setBracketTournament] = useState<MockTournament | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState<AdminTournamentRow | null>(null);
  const [pending, startTransition] = useTransition();

  const handleDelete = (t: AdminTournamentRow) => {
    if (!confirm(`ნამდვილად წავშალო "${t.name}"? მონაწილეებიც წაიშლება.`)) return;
    startTransition(async () => {
      const res = await deleteTournamentAction(t.id);
      if (res.ok) {
        toast.success("ჩემპიონატი წაიშალა");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">ჩემპიონატები</h2>
        <Button onClick={() => setShowForm(true)} disabled={games.length === 0}>
          <Plus className="mr-1 h-4 w-4" /> ახალი ჩემპიონატი
        </Button>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {tournaments.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              ჯერ ჩემპიონატი არ არის. დააჭირე „ახალი ჩემპიონატი“-ს.
            </p>
          ) : (
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
                {tournaments.map((t) => (
                  <tr key={t.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/tournaments/${t.slug}`} className="hover:text-primary">
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <GameIcon
                        game={{ emoji: t.gameEmoji, nameKa: t.gameNameKa, iconUrl: t.gameIconUrl ?? undefined, invertIcon: false }}
                        size="lg"
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{FORMAT_LABEL[t.format] ?? t.format}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{t.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.participantCount}/{t.maxParticipants}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mr-1 text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={() => setBracketTournament(toBracketShape(t))}
                        title="კენჭისყრა / Bracket"
                      >
                        <GitBranch className="mr-1 h-4 w-4" /> კენჭისყრა
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditRow(t)} title="რედაქტირება">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(t)} disabled={pending} title="წაშლა">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {bracketTournament && <BracketDraw tournament={bracketTournament} onClose={() => setBracketTournament(null)} />}
      {showForm && (
        <TournamentForm
          games={games}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            router.refresh();
          }}
        />
      )}
      {editRow && (
        <TournamentForm
          games={games}
          initial={editRow}
          onClose={() => setEditRow(null)}
          onSaved={() => {
            setEditRow(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
