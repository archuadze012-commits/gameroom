"use client";

import { useState } from "react";
import { Swords, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { mockGames } from "@/lib/mock-data";
import { INVITE_SENT_FEEDBACK_MS } from "@/lib/constants";

export interface GameInvite {
  id: string;
  fromUsername: string;
  fromDisplay: string;
  toUsername: string;
  gameSlug: string;
  gameName: string;
  sentAt: number;
}

export function saveInvite(invite: GameInvite) {
  try {
    const key = `gameroom_invites_${invite.toUsername}`;
    const existing: GameInvite[] = JSON.parse(localStorage.getItem(key) ?? "[]");
    existing.push(invite);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {}
}

export function loadAndClearInvites(username: string): GameInvite[] {
  try {
    const key = `gameroom_invites_${username}`;
    const invites: GameInvite[] = JSON.parse(localStorage.getItem(key) ?? "[]");
    localStorage.removeItem(key);
    return invites;
  } catch {
    return [];
  }
}

interface InviteButtonProps {
  username: string;
  displayName: string;
  gameSlugs: string[];
}

function makeInviteTimestamp() {
  return Math.round(performance.timeOrigin + performance.now());
}

export function InviteButton({ username, displayName, gameSlugs }: InviteButtonProps) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const games = gameSlugs
    .map((slug) => mockGames.find((g) => g.slug === slug))
    .filter(Boolean) as typeof mockGames;

  const handlePick = (gameSlug: string) => {
    const game = mockGames.find((g) => g.slug === gameSlug);
    if (!game) return;
    setOpen(false);
    setSent(true);

    // Read sender's username from localStorage
    let fromUsername = "me";
    let fromDisplay = "შენ";
    try {
      const raw = localStorage.getItem("gameroom_profile");
      const profile = raw ? JSON.parse(raw) : {};
      fromUsername = profile.username ?? "me";
      fromDisplay = profile.displayName ?? fromUsername;
    } catch {}

    const invite: GameInvite = {
      id: crypto.randomUUID(),
      fromUsername,
      fromDisplay,
      toUsername: username,
      gameSlug: game.slug,
      gameName: game.nameKa,
      sentAt: makeInviteTimestamp(),
    };

    saveInvite(invite);

    toast.success("შეთავაზება გაიგზავნა!", {
      description: `${displayName}-ს ეცნობება ${game.nameKa}-ში თამაშის მოწვევა.`,
      duration: 4000,
    });

    setTimeout(() => setSent(false), INVITE_SENT_FEEDBACK_MS);
  };

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        disabled={sent}
        className={sent ? "bg-emerald-600 hover:bg-emerald-600" : ""}
      >
        {sent ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Swords className="mr-1.5 h-3.5 w-3.5" />}
        {sent ? "გაიგზავნა" : "ვიყომაროთ"}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">აირჩიე თამაში</h2>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-secondary/60">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-sm text-muted-foreground">{displayName}-ის ფავორიტი თამაშები</p>

            <div className="flex flex-col gap-2">
              {games.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">ფავორიტი თამაში არ მოიძებნა</p>
              )}
              {games.map((g) => (
                <button
                  key={g.slug}
                  onClick={() => handlePick(g.slug)}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-border/60 bg-secondary/20 p-3 text-left transition-all hover:border-primary/40 hover:bg-secondary/40"
                >
                  {g.coverUrl && (
                    <div className="absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20">
                      {/* eslint-disable-next-line @next/next/no-img-element -- decorative cover from an arbitrary external URL */}
                      <img src={g.coverUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <span className="relative text-2xl">{g.emoji}</span>
                  <div className="relative">
                    <p className="font-medium leading-tight">{g.nameKa}</p>
                    <p className="text-xs text-muted-foreground">{g.players.toLocaleString("en-US")} მოთამაშე</p>
                  </div>
                  <Swords className="relative ml-auto h-4 w-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
