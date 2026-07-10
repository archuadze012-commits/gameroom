"use client";

import { useState } from "react";
import { Swords, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { INVITE_SENT_FEEDBACK_MS } from "@/lib/constants";
import { selectInviteGames } from "@/lib/critical-workflows";

interface InviteButtonProps {
  username: string;
  displayName: string;
  gameSlugs: string[];
}

type InviteGame = {
  slug: string;
  nameKa: string;
  coverUrl?: string;
  emoji: string;
};

export function InviteButton({ username, displayName, gameSlugs }: InviteButtonProps) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [games, setGames] = useState<InviteGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);

  const openPicker = async () => {
    setOpen(true);
    if (games.length > 0 || loadingGames) return;
    setLoadingGames(true);
    try {
      const response = await fetch("/api/games", { cache: "no-store" });
      const catalog = await response.json().catch(() => []);
      if (!response.ok || !Array.isArray(catalog)) throw new Error("games_fetch_failed");
      setGames(selectInviteGames(catalog as InviteGame[], gameSlugs));
    } catch {
      toast.error("თამაშების სია ვერ ჩაიტვირთა");
    } finally {
      setLoadingGames(false);
    }
  };

  const handlePick = async (gameSlug: string) => {
    const game = games.find((item) => item.slug === gameSlug);
    if (!game || sending) return;
    setSending(true);
    try {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, gameSlug }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "invite_failed");

      setOpen(false);
      setSent(true);
      toast.success("შეთავაზება გაიგზავნა!", {
        description: `${displayName}-ს ეცნობება ${game.nameKa}-ში თამაშის მოწვევა.`,
        duration: 4000,
      });
      window.setTimeout(() => setSent(false), INVITE_SENT_FEEDBACK_MS);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "invite_failed";
      toast.error(
        reason === "blocked" ? "ამ მომხმარებელთან მოწვევის გაგზავნა შეუძლებელია" : "მოწვევა ვერ გაიგზავნა",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        onClick={() => void openPicker()}
        disabled={sent || sending}
        className={sent ? "bg-emerald-600 hover:bg-emerald-600" : ""}
      >
        {sent ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Swords className="mr-1.5 h-3.5 w-3.5" />}
        {sent ? "გაიგზავნა" : sending ? "იგზავნება..." : "ვიყომაროთ"}
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
              {loadingGames && (
                <p className="py-6 text-center text-sm text-muted-foreground">იტვირთება...</p>
              )}
              {!loadingGames && games.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">ფავორიტი თამაში არ მოიძებნა</p>
              )}
              {games.map((g) => (
                <button
                  key={g.slug}
                  onClick={() => void handlePick(g.slug)}
                  disabled={sending}
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
