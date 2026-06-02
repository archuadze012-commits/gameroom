"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  registerForTournamentAction,
  checkinForTournamentAction,
  reportMatchScoreAction,
} from "./actions";
import type { BracketMatch } from "@/lib/tournament/generate-bracket";

type ActiveMatch = BracketMatch & { id: string };

export function TournamentActions({
  tournamentId,
  tournamentSlug,
  status,
  isRegistered,
  isCheckedIn,
  currentUser,
  activeMatch,
}: {
  tournamentId: string;
  tournamentSlug: string;
  status: string;
  isRegistered: boolean;
  isCheckedIn: boolean;
  currentUser: { id: string } | null;
  activeMatch?: ActiveMatch;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [score1, setScore1] = useState("0");
  const [score2, setScore2] = useState("0");

  if (!currentUser) {
    return (
      <Button size="lg" onClick={() => router.push("/auth/login")}>
        შედით დასარეგისტრირებლად
      </Button>
    );
  }

  async function handleRegister() {
    startTransition(async () => {
      const res = await registerForTournamentAction(tournamentId, tournamentSlug);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  async function handleCheckin() {
    startTransition(async () => {
      const res = await checkinForTournamentAction(tournamentId, tournamentSlug);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  async function handleReport() {
    if (!activeMatch) return;
    startTransition(async () => {
      const res = await reportMatchScoreAction(
        activeMatch.id,
        parseInt(score1),
        parseInt(score2),
        tournamentSlug
      );
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {status === "open" && (
          <>
            {isRegistered ? (
              <Button size="lg" variant="secondary" disabled>
                დარეგისტრირებული ხარ ✔
              </Button>
            ) : (
              <Button size="lg" onClick={handleRegister} disabled={isPending}>
                {isPending ? "რეგისტრაცია..." : "დარეგისტრირდი"}
              </Button>
            )}
          </>
        )}

        {status === "checkin" && (
          <>
            {!isRegistered ? (
              <Button size="lg" variant="outline" disabled>
                რეგისტრაცია დახურულია
              </Button>
            ) : isCheckedIn ? (
              <Button size="lg" variant="secondary" disabled>
                Checked-in ✔
              </Button>
            ) : (
              <Button size="lg" onClick={handleCheckin} disabled={isPending}>
                {isPending ? "Check-in..." : "Check-in"}
              </Button>
            )}
          </>
        )}

        {status === "live" && !activeMatch && (
          <Button size="lg" variant="outline" onClick={() => toast.info("შენი მატჩი ჯერ არ დაწყებულა")}>
            უყურე LIVE
          </Button>
        )}

        {status === "completed" && (
          <Button size="lg" variant="secondary" disabled>
            დასრულდა 🏆
          </Button>
        )}
      </div>

      {status === "live" && activeMatch && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <h3 className="font-bold text-primary flex items-center gap-2">
            🎮 ჩემი მატჩი
          </h3>
          <div className="flex items-center gap-4 text-sm font-medium">
            <div className="flex-1 text-right">{activeMatch.player1?.name || "???"}</div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={score1}
                onChange={(e) => setScore1(e.target.value)}
                className="w-12 h-8 text-center bg-background"
                disabled={isPending}
              />
              <span>:</span>
              <Input
                type="number"
                value={score2}
                onChange={(e) => setScore2(e.target.value)}
                className="w-12 h-8 text-center bg-background"
                disabled={isPending}
              />
            </div>
            <div className="flex-1">{activeMatch.player2?.name || "???"}</div>
          </div>
          <Button size="sm" className="w-full" onClick={handleReport} disabled={isPending}>
            {isPending ? "იგზავნება..." : "შედეგის შეტანა"}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            * შედეგის შეტანის შემდეგ მატჩი გადავა განხილვის სტადიაში.
          </p>
        </div>
      )}
    </div>
  );
}
