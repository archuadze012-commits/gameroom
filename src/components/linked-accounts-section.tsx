"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Unlink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type LinkedAccount = {
  provider: "steam" | "tiktok";
  external_id: string;
  data: {
    personaName?: string;
    avatarUrl?: string;
    profileUrl?: string;
    gameCount?: number;
    topGames?: { appid: number; name: string; minutes: number }[];
    displayName?: string;
    username?: string;
  } | null;
  verified: boolean;
  linked_at: string;
};

export function LinkedAccountsSection() {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/linked-accounts");
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/linked-accounts");
        const data = await res.json();
        setAccounts(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    })();
    // refresh once when redirected back from steam or tiktok
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("steam") === "ok") {
        toast.success("Steam ანგარიში დაკავშირდა ✅");
      } else if (params.get("steam") === "invalid") {
        toast.error("Steam-ის ვერიფიკაცია ვერ მოხერხდა");
      } else if (params.get("tiktok") === "ok") {
        toast.success("TikTok ანგარიში დაკავშირდა ✅");
      } else if (params.get("tiktok") === "error") {
        const reason = params.get("reason");
        if (reason === "csrf") toast.error("უსაფრთხოების (CSRF) შეცდომა. თავიდან სცადე");
        else if (reason === "config") toast.error("TikTok პარამეტრები არ არის გამართული");
        else toast.error("TikTok-ის ვერიფიკაცია ვერ მოხერხდა");
      }
    }
  }, []);

  const startSteam = () => {
    window.location.href = "/api/auth/steam/start";
  };

  const startTikTok = () => {
    window.location.href = "/api/auth/tiktok/start";
  };

  const unlink = async (provider: string) => {
    if (!confirm(`გაუქმდეს ${provider}-ის კავშირი?`)) return;
    await fetch(`/api/linked-accounts?provider=${provider}`, { method: "DELETE" });
    toast.success("გათიშულია");
    load();
  };

  const steam = accounts.find((a) => a.provider === "steam");
  const tiktok = accounts.find((a) => a.provider === "tiktok");

  if (loading) {
    return (
      <div className="pubg-loadout-card relative overflow-hidden p-6 sm:p-8">
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-[#10b981]" />
        <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-25 z-[5]" />
        <div className="relative z-10 flex items-center justify-center p-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="pubg-loadout-card relative overflow-hidden p-6 sm:p-8">
      <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
      <span
        aria-hidden
        className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5]"
        style={{
          background: "#10b981",
          boxShadow: "0 0 10px rgba(16, 185, 129, 0.8)"
        }}
      />
      <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-25 z-[5]" />

      <div className="relative z-10 space-y-6">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">დაკავშირებული ანგარიშები</h3>

        {/* Steam */}
        <div className="rounded-md border border-white/5 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-500/20 text-blue-400">
                <SteamIcon />
              </div>
              <div>
                <p className="text-sm font-medium">Steam</p>
                {steam ? (
                  <p className="text-xs text-muted-foreground">
                    {steam.data?.personaName ?? steam.external_id}{" "}
                    {steam.verified && (
                      <CheckCircle2 className="ml-1 inline h-3 w-3 text-emerald-400" />
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">დააკავშირე — გამოჩნდება შენი თამაშები</p>
                )}
              </div>
            </div>
            {steam ? (
              <Button size="sm" variant="outline" onClick={() => unlink("steam")}>
                <Unlink className="mr-1 h-3.5 w-3.5" /> გათიშვა
              </Button>
            ) : (
              <Button size="sm" onClick={startSteam}>
                Connect
              </Button>
            )}
          </div>
          {steam?.data?.topGames && steam.data.topGames.length > 0 && (
            <div className="mt-3 space-y-1 border-t border-white/5 pt-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {steam.data.gameCount} თამაში · ყველაზე ნათამაშები:
              </p>
              <div className="flex flex-wrap gap-1">
                {steam.data.topGames.slice(0, 8).map((g) => (
                  <Badge key={g.appid} variant="outline" className="text-[10px]">
                    {g.name} ({Math.floor(g.minutes / 60)}h)
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* TikTok */}
        <div className="rounded-md border border-white/5 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-pink-500/20 text-pink-400">
                <TikTokIcon />
              </div>
              <div>
                <p className="text-sm font-medium">TikTok</p>
                {tiktok ? (
                  <p className="text-xs text-muted-foreground">
                    {tiktok.data?.displayName ?? tiktok.data?.username ?? tiktok.external_id}{" "}
                    {tiktok.data?.username && (
                      <span className="text-[10px] text-muted-foreground opacity-70">
                        (@{tiktok.data.username})
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">დააკავშირე — აჩვენე შენი გეიმინგ ვიდეოები</p>
                )}
              </div>
            </div>
            {tiktok ? (
              <Button size="sm" variant="outline" onClick={() => unlink("tiktok")}>
                <Unlink className="mr-1 h-3.5 w-3.5" /> გათიშვა
              </Button>
            ) : (
              <Button size="sm" onClick={startTikTok}>
                Connect
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SteamIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0Z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.95 1.2 2.27 2.05 3.75 2.45v3.9c-1.36-.04-2.68-.48-3.82-1.28-.86-.6-1.57-1.39-2.1-2.31v7.6c.03 1.21-.24 2.41-.78 3.51-.55 1.1-1.35 2.04-2.34 2.76-1.02.73-2.22 1.19-3.48 1.35-1.25.15-2.53-.02-3.71-.5-1.18-.48-2.22-1.29-3.03-2.33-.8-1.04-1.32-2.28-1.5-3.59-.18-1.31.02-2.64.57-3.85.55-1.2 1.44-2.22 2.56-2.95.83-.54 1.76-.9 2.73-1.07V12c-.52.06-1.03.24-1.48.53-.51.32-.92.77-1.18 1.3-.26.54-.36 1.14-.29 1.74.07.6.31 1.17.69 1.63.38.46.88.8 1.44 1 .57.19 1.18.22 1.76.08.58-.13 1.11-.44 1.52-.88.42-.44.69-1 .78-1.6.09-.59.03-1.89.03-1.89v-13.8h.01Z" />
    </svg>
  );
}
