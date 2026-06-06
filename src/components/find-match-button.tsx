"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, Zap, X, UserCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";

const SEARCH_SECONDS = 60;

type Props = {
  gameSlug: string;
  gameName: string;
  size?: "sm" | "lg";
  variant?: "default" | "outline";
  className?: string;
};

type Partner = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
};

type Status =
  | { state: "idle" }
  | { state: "searching"; queueId: string }
  | { state: "confirm_wait"; queueId: string }
  | { state: "matched"; conversationId: string; partner: Partner | null }
  | { state: "expired" };

export function FindMatchButton({ gameSlug, gameName, size = "sm", variant = "default", className }: Props) {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [remaining, setRemaining] = useState(SEARCH_SECONDS);
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueIdRef = useRef("");

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const stopTimers = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  };

  const startTimers = () => {
    stopTimers();
    setRemaining(SEARCH_SECONDS);
    pollRef.current = setInterval(poll, 3000);
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          stopTimers();
          setStatus({ state: "confirm_wait", queueId: queueIdRef.current });
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  };

  const poll = async () => {
    try {
      const res = await fetch(`/api/lfg/queue/status?gameSlug=${encodeURIComponent(gameSlug)}`);
      const data = await res.json();
      if (data.status === "matched") {
        stopTimers();
        setStatus({ state: "matched", conversationId: data.conversationId, partner: data.partner });
      } else if (data.status === "expired" || data.status === "cancelled") {
        stopTimers();
        setStatus({ state: "expired" });
      }
    } catch {}
  };

  const findMatch = async () => {
    flushSync(() => {
      setStatus({ state: "searching", queueId: "" });
      setRemaining(SEARCH_SECONDS);
    });
    try {
      const res = await fetch("/api/lfg/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameSlug }),
      });
      if (res.status === 401) {
        toast.error("შესვლა საჭიროა");
        setStatus({ state: "idle" });
        return;
      }
      const data = await res.json();

      if (data.status === "matched") {
        setStatus({ state: "matched", conversationId: data.conversationId, partner: null });
        poll();
      } else if (data.status === "searching") {
        queueIdRef.current = data.queueId;
        setStatus({ state: "searching", queueId: data.queueId });
        startTimers();
      } else if (data.error === "already_searching") {
        toast.info("უკვე ეძებ match-ს ამ თამაშისთვის");
        setStatus({ state: "searching", queueId: "" });
        startTimers();
      } else {
        toast.error("ვერ ვიპოვე queue");
        setStatus({ state: "idle" });
      }
    } catch {
      toast.error("შეცდომა");
      setStatus({ state: "idle" });
    }
  };

  const extendSearch = () => {
    const queueId = status.state === "confirm_wait" ? status.queueId : queueIdRef.current;
    setStatus({ state: "searching", queueId });
    startTimers();
  };

  const cancel = async () => {
    stopTimers();
    try { await fetch("/api/lfg/queue", { method: "DELETE" }); } catch {}
    setStatus({ state: "idle" });
  };

  const goToMatch = () => {
    if (status.state === "matched") router.push(`/messages/${status.conversationId}`);
  };

  const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");

  if (status.state === "idle") {
    const defaultClasses = variant === "default"
      ? "neon-btn rounded-full bg-[rgba(10,14,34,0.6)] backdrop-blur-md hover:-translate-y-0.5 transition-all duration-300 text-white font-bold tracking-wide"
      : "";

    return (
      <Button 
        onClick={findMatch} 
        size={size} 
        variant={variant} 
        className={`${defaultClasses} ${className || ""}`}
      >
        <Zap className="mr-1.5 h-3.5 w-3.5 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" /> Find Match
      </Button>
    );
  }

  if (status.state === "searching") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-border bg-card p-8 shadow-2xl">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
            <div className="relative grid h-16 w-16 place-items-center rounded-full bg-primary/15 text-primary">
              <Search className="h-7 w-7 animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold">ვეძებთ პარტნიორს...</h3>
            <p className="mt-1 text-sm text-muted-foreground">{gameName}</p>
          </div>
          <div className="font-mono text-2xl font-bold tabular-nums text-primary">
            {mm}:{ss}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            როცა ვინმე გამოჩნდება იგივე queue-ში, ავტომატურად შეგაერთებთ DM-ში
          </p>
          <Button onClick={cancel} variant="outline" className="w-full">
            <X className="mr-1.5 h-4 w-4" /> გაუქმება
          </Button>
        </div>
      </div>
    );
  }

  if (status.state === "confirm_wait") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-amber-500/40 bg-card p-8 shadow-2xl">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-amber-500/15 text-amber-400">
            <Search className="h-7 w-7" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold">პარტნიორი ვერ მოიძებნა</h3>
            <p className="mt-1 text-sm text-muted-foreground">{gameName}</p>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            დაველოდოთ კიდევ ერთ წუთს?
          </p>
          <div className="flex w-full gap-3">
            <Button onClick={extendSearch} className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500 text-white">
              <Check className="h-4 w-4" /> კი
            </Button>
            <Button onClick={cancel} variant="outline" className="flex-1 gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10">
              <X className="h-4 w-4" /> არა
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status.state === "matched") {
    const partner = status.partner;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-primary/40 bg-card p-8 shadow-2xl">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/15 text-primary">
            <UserCheck className="h-7 w-7" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-primary">Match!</h3>
            <p className="text-sm text-muted-foreground">{gameName}-ისთვის ვინმე იპოვა</p>
          </div>
          {partner && (
            <div className="flex items-center gap-3">
              <UserAvatar
                username={partner.username}
                displayName={partner.display_name ?? undefined}
                avatarUrl={partner.avatar_url}
                size="lg"
              />
              <div>
                <p className="flex items-center gap-1 font-bold">
                  {partner.display_name ?? partner.username}
                  {partner.is_verified && <VerifiedBadge className="h-4 w-4" />}
                </p>
                <p className="text-xs text-muted-foreground">@{partner.username}</p>
              </div>
            </div>
          )}
          <div className="flex w-full gap-2">
            <Button onClick={goToMatch} className="flex-1">გახსნა DM-ში</Button>
            <Button onClick={() => setStatus({ state: "idle" })} variant="outline">დახურვა</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
        <Search className="h-8 w-8 text-muted-foreground opacity-50" />
        <p className="font-semibold">Match ვერ მოიძებნა</p>
        <p className="text-xs text-muted-foreground">5 წუთის განმავლობაში არავინ შემოუერთდა queue-ს</p>
        <div className="flex w-full gap-2">
          <Button onClick={findMatch} className="flex-1">თავიდან ცდა</Button>
          <Button onClick={() => setStatus({ state: "idle" })} variant="outline">დახურვა</Button>
        </div>
      </div>
    </div>
  );
}
