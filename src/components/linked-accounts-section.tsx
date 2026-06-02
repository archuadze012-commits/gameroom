"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Unlink, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type LinkedAccount = {
  provider: "steam" | "riot";
  external_id: string;
  data: {
    personaName?: string;
    avatarUrl?: string;
    profileUrl?: string;
    gameCount?: number;
    topGames?: { appid: number; name: string; minutes: number }[];
    riotId?: string;
    tierName?: string;
    tierEmoji?: string;
    valShard?: string;
  } | null;
  verified: boolean;
  linked_at: string;
};

export function LinkedAccountsSection() {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [riotInput, setRiotInput] = useState("");
  const [linkingRiot, setLinkingRiot] = useState(false);

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
    // refresh once when redirected back from steam
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("steam") === "ok") {
        toast.success("Steam ანგარიში დაკავშირდა ✅");
      } else if (params.get("steam") === "invalid") {
        toast.error("Steam-ის ვერიფიკაცია ვერ მოხერხდა");
      }
    }
  }, []);

  const startSteam = () => {
    window.location.href = "/api/auth/steam/start";
  };

  const linkRiot = async () => {
    if (!riotInput.trim().includes("#")) {
      toast.error("ფორმატი: gameName#tagLine");
      return;
    }
    setLinkingRiot(true);
    try {
      const res = await fetch("/api/auth/riot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riotId: riotInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503) toast.error("RIOT_API_KEY არ არის set");
        else if (res.status === 404) toast.error("Riot ID ვერ მოიძებნა");
        else toast.error(data.error ?? "შეცდომა");
        return;
      }
      toast.success("Riot ID მიბმულია ✅");
      setRiotInput("");
      load();
    } finally {
      setLinkingRiot(false);
    }
  };

  const unlink = async (provider: string) => {
    if (!confirm(`გაუქმდეს ${provider}-ის კავშირი?`)) return;
    await fetch(`/api/linked-accounts?provider=${provider}`, { method: "DELETE" });
    toast.success("გათიშულია");
    load();
  };

  const steam = accounts.find((a) => a.provider === "steam");
  const riot = accounts.find((a) => a.provider === "riot");

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <h3 className="text-sm font-semibold">დაკავშირებული ანგარიშები</h3>

        {/* Steam */}
        <div className="rounded-md border border-border/60 p-3">
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
            <div className="mt-3 space-y-1 border-t border-border/40 pt-3">
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

        {/* Riot */}
        <div className="rounded-md border border-border/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-red-500/20 text-red-400">
                <RiotIcon />
              </div>
              <div>
                <p className="text-sm font-medium">Riot Games</p>
                {riot ? (
                  <p className="text-xs text-muted-foreground">
                    {riot.data?.riotId ?? riot.external_id}{" "}
                    {riot.data?.tierEmoji && (
                      <span className="ml-1">
                        {riot.data.tierEmoji} {riot.data.tierName}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">დაამატე Valorant rank პროფილზე</p>
                )}
              </div>
            </div>
            {riot && (
              <Button size="sm" variant="outline" onClick={() => unlink("riot")}>
                <Unlink className="mr-1 h-3.5 w-3.5" /> გათიშვა
              </Button>
            )}
          </div>
          {!riot && (
            <div className="mt-3 flex gap-2 border-t border-border/40 pt-3">
              <Input
                placeholder="gameName#TAG"
                value={riotInput}
                onChange={(e) => setRiotInput(e.target.value)}
                className="text-xs"
              />
              <Button size="sm" onClick={linkRiot} disabled={linkingRiot || !riotInput.trim()}>
                {linkingRiot ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link"}
              </Button>
            </div>
          )}
          {riot && !riot.verified && (
            <p className="mt-2 flex items-center gap-1 text-[10px] text-amber-400">
              <AlertCircle className="h-3 w-3" />
              Soft-linked — RSO ვერიფიკაცია მოგვიანებით
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SteamIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0Z" />
    </svg>
  );
}

function RiotIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M22.155 3.272v17.456l-7.272-2.91v2.91h-1.819v-3.636l-1.818-.728v4.364h-1.819v-5.092l-1.818-.728V20.728H5.79v-7.273l-1.818-.728v8.001H2.155V3.272l2.728 6.546h.91l-.91-5.455h1.818l1.819 6.728h.91L8.518 4.364h1.819l1.818 7.273h.91L12.155 4.364h1.819l1.818 8h.91l-.91-8h1.819l1.818 8.728h.91l-.91-8.728h1.726Z" />
    </svg>
  );
}
