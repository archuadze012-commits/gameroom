"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Users, Headphones } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GamerCard } from "@/components/ui/gamer-card";

type DiscordMember = {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  isMuted: boolean;
  isDeaf: boolean;
  isStreaming: boolean;
};

type DiscordChannel = {
  id: string;
  name: string;
  members: DiscordMember[];
  userCount: number;
  userLimit: number;
};

type DiscordData = {
  guildId: string;
  serverName: string;
  serverIcon: string;
  channels: DiscordChannel[];
};

export function DiscordVoiceDashboard({ gameSlug }: { gameSlug?: string }) {
  const [data, setData] = useState<DiscordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const url = gameSlug ? `/api/discord/voice?game=${gameSlug}` : "/api/discord/voice";
      const res = await fetch(url);
      const d: DiscordData | { error?: string } = await res.json();
      if (!res.ok) throw new Error(("error" in d && d.error) || "Failed to fetch");
      setData(d as DiscordData);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [gameSlug]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval !== null) return;
      interval = setInterval(() => { void fetchData(); }, 10000);
    };
    const stop = () => {
      if (interval !== null) { clearInterval(interval); interval = null; }
    };

    void fetchData();
    // Don't poll a hidden tab — a backgrounded dashboard kept hammering Discord
    // every 10s. Pause on hide, refresh + resume on show.
    if (document.visibilityState === "visible") start();
    const onVisibility = () => {
      if (document.visibilityState === "visible") { void fetchData(); start(); }
      else stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-6 text-center">
        <p className="text-sm text-destructive font-semibold">Discord-თან დაკავშირება ვერ მოხერხდა</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--gr-border)] pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-[var(--gr-border-hi)] shadow-[0_0_15px_rgba(139,92,246,0.2)]">
            <AvatarImage src={data?.serverIcon} />
            <AvatarFallback className="bg-[var(--gr-bg-2)] text-[var(--gr-violet-hi)] font-bold text-sm">
              {data?.serverName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <Eyebrow tone="violet" square={false} className="text-xs font-black tracking-[0.16em]">
                {data?.serverName}
              </Eyebrow>
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            </div>
            <p className="text-[9px] text-[var(--gr-text-mute)] uppercase tracking-[0.12em] mt-0.5">
              დისქორდ ჩენელები
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {data?.channels.map((channel) => (
          <a
            key={channel.id}
            href={`discord://discord.com/channels/${data?.guildId}/${channel.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <GamerCard
              color="rgba(196,30,58,0.78)"
              clipSize={14}
              hover
              className="h-32"
            >
              <div className="relative flex h-[126px] flex-col bg-[linear-gradient(180deg,rgba(12,9,21,0.98),rgba(8,6,16,1))] px-3 py-2.5">
                <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-[0.08]" />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(196,30,58,0.16),transparent_34%),linear-gradient(180deg,transparent_10%,rgba(7,6,16,0.18)_55%,rgba(7,6,16,0.92)_100%)]"
                />

                <div className="relative flex items-center justify-between gap-2">
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[rgba(196,30,58,0.16)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white ring-1 ring-[rgba(196,30,58,0.3)]">
                    <Users className="h-3 w-3 text-white drop-shadow-[0_0_8px_rgba(196,30,58,0.85)]" />
                    {channel.userCount}
                    {channel.userLimit > 0 ? `/${channel.userLimit}` : ""}
                  </span>

                  <div className="flex h-5.5 shrink-0 items-center -space-x-1.5 overflow-hidden">
                    {channel.members.length === 0 ? (
                      <span className="text-[9px] italic text-[var(--gr-text-dim)]">ცარიელია</span>
                    ) : (
                      channel.members.slice(0, 3).map((member) => (
                        <div key={member.id} className="relative shrink-0">
                          <Avatar className="h-5 w-5 border border-[rgba(196,30,58,0.22)] shadow-[0_0_10px_rgba(196,30,58,0.1)]">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="bg-[var(--gr-bg-2)] text-[6px] text-[var(--gr-text)]">
                              {member.username.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {member.isStreaming && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-[var(--gr-bg-1)] bg-red-500" />
                          )}
                        </div>
                      ))
                    )}
                    {channel.members.length > 3 && (
                      <span className="shrink-0 pl-1 text-[8px] font-bold text-[var(--gr-text-mute)]">
                        +{channel.members.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative mt-auto flex items-end justify-between gap-3 pt-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--gr-text-dim)]">
                      Discord Voice
                    </p>
                    <h4
                      className="mt-1 line-clamp-2 font-display text-[14px] font-extrabold uppercase leading-[1.08] tracking-tight text-white"
                      style={{ textShadow: "0 0 5px rgba(196,30,58,0.52), 0 0 12px rgba(196,30,58,0.24)" }}
                      title={channel.name}
                    >
                      {channel.name}
                    </h4>
                  </div>

                  <span className="grid h-10 w-10 shrink-0 place-items-center text-white">
                    <Headphones
                      className="h-5 w-5 text-white"
                      style={{
                        filter:
                          "drop-shadow(0 0 8px rgba(196,30,58,0.96)) drop-shadow(0 0 18px rgba(196,30,58,0.58)) drop-shadow(0 0 28px rgba(196,30,58,0.26))",
                      }}
                    />
                  </span>
                </div>
              </div>
            </GamerCard>
          </a>
        ))}
      </div>
    </div>
  );
}
