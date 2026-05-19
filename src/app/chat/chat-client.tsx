"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Hash, Globe, Tag, Cpu, Users as UsersIcon, Volume2, Menu, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GameIcon } from "@/components/game-icon";
import { UserAvatar } from "@/components/user-avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MentionText } from "@/components/mention-text";
import Link from "next/link";
import {
  mockChatChannels,
  mockChatMessages,
  mockGames,
  mockUsers,
  channelDescriptions,
  type MockChatMessage,
} from "@/lib/mock-data";

const ADMIN_USERNAMES = new Set(
  mockUsers.filter((u) => u.role === "admin").map((u) => u.username),
);

const onlineUsers = [
  "archuadze012", "GeoSniper", "Lasha10", "Sage_Tbilisi", "ZeroKD",
  "Beka", "Nika", "Lika", "Saba", "Vakho", "Tamo", "Giorgi",
];

function formatTime(d: Date) {
  return d.toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function ChatClient() {
  const [activeChannelId, setActiveChannelId] = useState<string>("global");
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, MockChatMessage[]>>(
    () => structuredClone(mockChatMessages),
  );
  const [unread, setUnread] = useState<Record<string, number>>(() =>
    Object.fromEntries(mockChatChannels.map((c) => [c.id, c.unread ?? 0])),
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showMobileChannels, setShowMobileChannels] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = messagesByChannel[activeChannelId] ?? [];
  const activeChannel = mockChatChannels.find((c) => c.id === activeChannelId);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, activeChannelId]);

  const selectChannel = (id: string) => {
    setActiveChannelId(id);
    setUnread((u) => ({ ...u, [id]: 0 }));
    setShowMobileChannels(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const { toxic } = await res.json();
      if (toxic) {
        toast.error("მესიჯი დაიბლოკა — შეიცავს აკრძალულ კონტენტს.");
        setSending(false);
        return;
      }
    } catch {
      // If moderation fails, allow the message through
    }

    const newMessage: MockChatMessage = {
      id: `me-${Date.now()}`,
      author: "შენ",
      body: trimmed,
      ago: formatTime(new Date()),
      isMe: true,
    };
    setMessagesByChannel((prev) => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] ?? []), newMessage],
    }));
    setInput("");
    setSending(false);
  };

  const ChannelIcon = ({ c }: { c: typeof mockChatChannels[number] }) => {
    if (c.gameSlug) {
      const game = mockGames.find((g) => g.slug === c.gameSlug);
      return game ? <GameIcon game={game} size="sm" /> : <Hash className="h-3.5 w-3.5 shrink-0" />;
    }
    if (c.type === "global") return <Globe className="h-3.5 w-3.5 shrink-0" />;
    if (c.type === "market") return <Tag className="h-3.5 w-3.5 shrink-0" />;
    if (c.type === "tech") return <Cpu className="h-3.5 w-3.5 shrink-0" />;
    return <Hash className="h-3.5 w-3.5 shrink-0" />;
  };

  return (
    <div className="relative grid h-[calc(100vh-16rem)] grid-cols-1 md:grid-cols-[240px_1fr_240px]">

      {/* Mobile channel drawer overlay */}
      {showMobileChannels && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowMobileChannels(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute left-0 top-0 flex h-full w-64 flex-col bg-sidebar border-r border-border/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 p-4 shrink-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">არხები</h3>
              <button onClick={() => setShowMobileChannels(false)} className="rounded-md p-1 hover:bg-secondary/60">
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex flex-col gap-0.5 overflow-y-auto flex-1 p-2">
              {mockChatChannels.map((c) => {
                const isActive = c.id === activeChannelId;
                const unreadCount = unread[c.id] ?? 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectChannel(c.id)}
                    className={`flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="h-4 w-4 shrink-0 flex items-center justify-center">
                        <ChannelIcon c={c} />
                      </span>
                      <span className="truncate">{c.name}</span>
                    </span>
                    {unreadCount > 0 && !isActive && (
                      <Badge className="h-5 min-w-5 px-1.5 text-[10px]">{unreadCount}</Badge>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
      {/* Channels */}
      <aside className="hidden border-r border-border/60 bg-sidebar/40 md:flex md:flex-col min-h-0">
        <div className="border-b border-border/60 p-4 shrink-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            არხები
          </h3>
        </div>
        <nav className="flex flex-col gap-0.5 p-2 overflow-y-auto flex-1 min-h-0">
          {mockChatChannels.map((c) => {
            const isActive = c.id === activeChannelId;
            const unreadCount = unread[c.id] ?? 0;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => selectChannel(c.id)}
                className={`flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="h-4 w-4 shrink-0 flex items-center justify-center">
                    <ChannelIcon c={c} />
                  </span>
                  <span className="truncate">{c.name}</span>
                </span>
                {unreadCount > 0 && !isActive && (
                  <Badge className="h-5 min-w-5 px-1.5 text-[10px]">{unreadCount}</Badge>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Messages */}
      <section className="flex min-h-0 flex-col">
        <div className="flex items-center gap-2 border-b border-border/60 p-4">
          <button
            type="button"
            onClick={() => setShowMobileChannels(true)}
            className="mr-1 rounded-md p-1.5 hover:bg-secondary/60 md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          {activeChannel?.gameSlug ? (
            <span className="h-5 w-5 flex items-center justify-center">
              <GameIcon game={mockGames.find((g) => g.slug === activeChannel.gameSlug)!} size="sm" />
            </span>
          ) : activeChannel?.type === "global" ? (
            <Globe className="h-4 w-4 text-primary" />
          ) : activeChannel?.type === "market" ? (
            <Tag className="h-4 w-4 text-primary" />
          ) : activeChannel?.type === "tech" ? (
            <Cpu className="h-4 w-4 text-primary" />
          ) : (
            <Hash className="h-4 w-4 text-primary" />
          )}
          <h2 className="font-semibold">{activeChannel?.name ?? "channel"}</h2>
          <span className="ml-2 truncate text-xs text-muted-foreground">
            {channelDescriptions[activeChannelId] ?? ""}
          </span>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              მესიჯი ჯერ არ არის — შენ იყავი პირველი 👇
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className="flex gap-3">
              <Link href={m.isMe ? "#" : `/profile/${m.author}`} className="shrink-0 hover:ring-2 hover:ring-primary/40 rounded-full transition-all">
                <UserAvatar username={m.author} size="sm" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <Link
                    href={m.isMe ? "#" : `/profile/${m.author}`}
                    className={`text-sm font-medium hover:underline ${
                      m.isMe ? "text-accent" : ADMIN_USERNAMES.has(m.author) ? "text-rose-400" : ""
                    }`}
                  >
                    {m.author}
                  </Link>
                  <span className="text-[10px] text-muted-foreground">{m.ago}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">
                  <MentionText>{m.body}</MentionText>
                </p>
              </div>
            </div>
          ))}
          <div className="rounded-md border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
            <Volume2 className="mx-auto mb-1 h-4 w-4 opacity-50" />
            ეს Demo ჩათია — მესიჯები ბრაუზერის მეხსიერებაშია, refresh-ის შემდეგ ქრება.
            რეალური real-time Supabase Realtime-ით ჩაჯდება Phase 2-ში.
          </div>
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border/60 p-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`დაწერე მესიჯი ${activeChannel?.name ?? ""} კანალში...`}
            className="bg-background/40"
            autoFocus
          />
          <Button type="submit" disabled={!input.trim() || sending}>
            {sending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </section>

      {/* Members */}
      <aside className="hidden border-l border-border/60 bg-sidebar/40 md:block">
        <div className="border-b border-border/60 p-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <UsersIcon className="h-3 w-3" /> ონლაინ — {onlineUsers.length}
          </h3>
        </div>
        <ul className="space-y-1 p-2 text-sm">
          {onlineUsers.map((u, i) => (
            <li key={u}>
              <Link
                href={`/profile/${u}`}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
              >
                <span className={`h-2 w-2 rounded-full shrink-0 ${i < 3 ? "bg-emerald-400" : "bg-amber-400/60"}`} />
                <UserAvatar username={u} size="sm" className="h-5 w-5" />
                <span className={ADMIN_USERNAMES.has(u) ? "text-rose-400 font-medium" : ""}>{u}</span>
                {ADMIN_USERNAMES.has(u) && (
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-rose-400/80">ADM</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
