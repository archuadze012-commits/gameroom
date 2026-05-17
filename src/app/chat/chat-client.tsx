"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Hash, Users as UsersIcon, Volume2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MentionText } from "@/components/mention-text";
import {
  mockChatChannels,
  mockChatMessages,
  channelDescriptions,
  type MockChatMessage,
} from "@/lib/mock-data";

const onlineUsers = [
  "Admin", "GeoSniper", "Lasha10", "Sage_Tbilisi", "ZeroKD",
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = messagesByChannel[activeChannelId] ?? [];
  const activeChannel = mockChatChannels.find((c) => c.id === activeChannelId);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, activeChannelId]);

  const selectChannel = (id: string) => {
    setActiveChannelId(id);
    setUnread((u) => ({ ...u, [id]: 0 }));
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
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
  };

  return (
    <div className="grid h-[calc(100vh-16rem)] grid-cols-1 md:grid-cols-[240px_1fr_240px]">
      {/* Channels */}
      <aside className="hidden border-r border-border/60 bg-sidebar/40 md:block">
        <div className="border-b border-border/60 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            კანალები
          </h3>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
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
                  <Hash className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{c.name.replace(/^#\s*/, "")}</span>
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
          <Hash className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">{activeChannel?.name.replace(/^#\s*/, "") ?? "channel"}</h2>
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
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback
                  className={
                    m.isMe
                      ? "bg-accent/20 text-accent text-xs"
                      : m.author === "Admin"
                      ? "bg-primary/15 text-primary text-xs"
                      : "bg-secondary text-foreground/80 text-xs"
                  }
                >
                  {m.author.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-sm font-medium ${
                      m.isMe ? "text-accent" : m.author === "Admin" ? "text-primary" : ""
                    }`}
                  >
                    {m.author}
                  </span>
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
            placeholder={`დაწერე მესიჯი #${activeChannel?.name.replace(/^#\s*/, "") ?? ""} კანალში...`}
            className="bg-background/40"
            autoFocus
          />
          <Button type="submit" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
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
            <li
              key={u}
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  i < 3 ? "bg-emerald-400" : "bg-amber-400/60"
                }`}
              />
              {u}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
