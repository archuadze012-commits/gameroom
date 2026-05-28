"use client";

import { useEffect, useState } from "react";
import { Mic, MicOff, Volume2, Video, Loader2, ExternalLink, Users, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eyebrow } from "@/components/ui/eyebrow";

const cutSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.5))";

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

  const fetchData = async () => {
    try {
      const url = gameSlug ? `/api/discord/voice?game=${gameSlug}` : "/api/discord/voice";
      const res = await fetch(url);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to fetch");
      setData(d);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [gameSlug]);

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
            className="block group"
          >
            <article
              className="relative isolate h-32 overflow-hidden transition-all duration-300"
              style={{ background: cardBorder, padding: 1, clipPath: cutSm }}
            >
              <div
                className="relative h-full w-full bg-[var(--gr-bg-1)] transition-transform duration-300 group-hover:scale-[1.01]"
                style={{ clipPath: cutSm }}
              >
                {/* Top Glow Border */}
                <span aria-hidden className="absolute left-0 top-0 z-10 h-[1.5px] w-full bg-[var(--gr-grad-violet)]" />

                {/* Ambient Gradients */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/15 to-cyan-500/5 opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--gr-bg-0)] via-[var(--gr-bg-0)]/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)] via-[var(--gr-bg-0)]/25 to-transparent" />

                {/* Atmosphere Circle */}
                <div aria-hidden className="absolute -left-8 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-white/5 blur-xl transition-transform duration-500 group-hover:scale-125" />

                {/* Laser lines left */}
                <div aria-hidden className="absolute inset-y-0 left-[22%] w-[1px] bg-[var(--gr-violet)]/40 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                <div aria-hidden className="absolute inset-y-0 left-[18%] w-[2px] bg-[var(--gr-violet)]/55 shadow-[0_0_15px_rgba(139,92,246,0.6)]" />

                {/* Dynamic Blue-Cyan Accent Shape on the left edge */}
                <div aria-hidden className="absolute left-0 top-0 h-full w-[18%] bg-[linear-gradient(180deg,rgba(34,211,238,0.9),rgba(139,92,246,0.25))] [clip-path:polygon(0_0,68%_0,100%_100%,0_100%)] opacity-80" />

                {/* Centered Circle Icon Container on the left panel */}
                <div className="absolute inset-y-0 left-[11%] z-[1] flex items-center justify-center">
                  <div className="rounded-full border border-white/12 bg-white/[0.04] p-3 shadow-[0_0_20px_rgba(139,92,246,0.25)] backdrop-blur-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                    <Headphones className="h-6 w-6 text-white/95 drop-shadow-[0_0_12px_rgba(34,211,238,0.45)]" />
                  </div>
                </div>

                {/* Top Details (User count pill + Avatars) */}
                <div className="absolute top-2.5 left-[24%] right-2.5 flex items-center justify-between gap-1.5 z-10">
                  {/* User Count */}
                  <span className="text-[10px] font-bold text-white/90 bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 shadow-sm">
                    <Users className="h-3 w-3 text-[var(--gr-violet-hi)]" />
                    {channel.userCount}{channel.userLimit > 0 ? `/${channel.userLimit}` : ""}
                  </span>

                  {/* Overlapping Avatar Stack */}
                  <div className="flex items-center -space-x-1.5 overflow-hidden h-5.5 shrink-0">
                    {channel.members.length === 0 ? (
                      <span className="text-[9px] text-[var(--gr-text-dim)] italic">ცარიელია</span>
                    ) : (
                      channel.members.slice(0, 3).map((member) => (
                        <div key={member.id} className="relative shrink-0">
                          <Avatar className="h-5 w-5 border border-[var(--gr-bg-1)] shadow-sm">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="text-[6px] bg-[var(--gr-bg-2)] text-[var(--gr-text)]">
                              {member.username.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {member.isStreaming && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 bg-red-500 rounded-full border border-[var(--gr-bg-1)]" />
                          )}
                        </div>
                      ))
                    )}
                    {channel.members.length > 3 && (
                      <span className="text-[8px] font-bold text-[var(--gr-text-mute)] pl-1 shrink-0">
                        +{channel.members.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Details (Channel Name) */}
                <div className="absolute bottom-2.5 left-[24%] right-2.5 z-10">
                  <h4
                    className="font-display text-[13px] font-extrabold uppercase leading-[1.1] tracking-tight text-[var(--gr-text)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)] group-hover:text-[var(--gr-violet-hi)] transition-colors line-clamp-2"
                    title={channel.name}
                  >
                    {channel.name}
                  </h4>
                </div>

              </div>
            </article>
          </a>
        ))}
      </div>
    </div>
  );
}
