"use client";

import { useState, useTransition } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GameIcon } from "@/components/game-icon";
import { toast } from "sonner";
import { createTournamentAction, updateTournamentAction } from "./actions";
import type { AdminTournamentRow, GameOption } from "./admin-tournaments-client";

const FORMATS: { value: string; label: string }[] = [
  { value: "single_elim", label: "Single Elimination" },
  { value: "double_elim", label: "Double Elimination" },
  { value: "round_robin", label: "Round Robin" },
];
const STATUSES = ["draft", "open", "checkin", "live", "completed", "cancelled"];

// ISO timestamp → the value a <input type="datetime-local"> expects (local time).
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  games: GameOption[];
  initial?: AdminTournamentRow;
  onClose: () => void;
  onSaved: () => void;
}

export function TournamentForm({ games, initial, onClose, onSaved }: Props) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [gameId, setGameId] = useState(
    initial ? (games.find((g) => g.slug === initial.gameSlug)?.id ?? games[0]?.id ?? "") : games[0]?.id ?? "",
  );
  const [format, setFormat] = useState(initial?.format ?? "single_elim");
  const [maxParticipants, setMaxParticipants] = useState(String(initial?.maxParticipants ?? 8));
  const [prizePool, setPrizePool] = useState(initial?.prizePool ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.startsAt ?? null));
  const [status, setStatus] = useState(initial?.status ?? "open");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("სახელი სავალდებულოა.");
      return;
    }
    if (!gameId) {
      toast.error("აირჩიე თამაში.");
      return;
    }
    startTransition(async () => {
      const res = isEdit
        ? await updateTournamentAction(initial!.id, {
            name,
            format,
            maxParticipants: Number(maxParticipants),
            prizePool,
            startsAt,
            status,
          })
        : await createTournamentAction({
            name,
            gameId,
            format,
            maxParticipants: Number(maxParticipants),
            prizePool,
            startsAt,
          });
      if (res.ok) {
        toast.success(isEdit ? "ჩემპიონატი განახლდა!" : `"${name}" ჩემპიონატი შეიქმნა!`);
        onSaved();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <h2 className="font-semibold">{isEdit ? "ჩემპიონატის რედაქტირება" : "ახალი ჩემპიონატი"}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-secondary/60">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label>სახელი</Label>
            <Input placeholder="მაგ. Georgia PUBG Cup 2026" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label>თამაში</Label>
              {games.length === 0 ? (
                <p className="text-xs text-muted-foreground">აქტიური თამაში ვერ მოიძებნა.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {games.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGameId(g.id)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        gameId === g.id
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/60 hover:border-border hover:bg-secondary/40"
                      }`}
                    >
                      <GameIcon game={{ emoji: g.emoji, nameKa: g.nameKa, iconUrl: g.iconUrl ?? undefined, invertIcon: false }} size="sm" />
                      <span className="truncate">{g.nameKa}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>ფორმატი</Label>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFormat(f.value)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs transition-colors ${
                    format === f.value
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

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
              <Label>პრიზი</Label>
              <Input placeholder="მაგ. 2,000 GEL" value={prizePool} onChange={(e) => setPrizePool(e.target.value)} />
            </div>
          </div>

          {isEdit && (
            <div className="space-y-1.5">
              <Label>სტატუსი</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>დაწყების დრო</Label>
            <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>გაუქმება</Button>
            <Button type="submit" disabled={pending}>
              <Check className="mr-1.5 h-4 w-4" /> {pending ? "..." : isEdit ? "შენახვა" : "შექმნა"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
