"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Hash, Globe, Tag, Cpu, Users as UsersIcon, Menu, X, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GameIcon } from "@/components/game-icon";
import { UserAvatar } from "@/components/user-avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MentionText } from "@/components/mention-text";
import { ReportButton } from "@/components/report-button";
import { VerifiedBadge } from "@/components/verified-badge";
import Link from "next/link";
import { mockChatChannels, mockGames, channelDescriptions } from "@/lib/mock-data";
import type { PublicProfile } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ChatMessage = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    role: string | null;
    is_verified?: boolean;
  } | null;
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("ka-GE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

export function ChatClient() {
  const [activeChannelId, setActiveChannelId] = useState<string>("global");
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, ChatMessage[]>>({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showMobileChannels, setShowMobileChannels] = useState(false);
  const [allUsers, setAllUsers] = useState<PublicProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string>("user");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = messagesByChannel[activeChannelId] ?? [];
  const activeChannel = mockChatChannels.find((c) => c.id === activeChannelId);

  // Get current user id + role
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setCurrentUserId(uid);
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .maybeSingle();
        setCurrentRole(profile?.role ?? "user");
      }
    });
  }, []);

  const canModerate = currentRole === "admin" || currentRole === "moderator";

  async function deleteMessage(id: string) {
    const res = await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessagesByChannel((prev) => ({
        ...prev,
        [activeChannelId]: (prev[activeChannelId] ?? []).filter((m) => m.id !== id),
      }));
      toast.success("მესიჯი წაშლილია");
    } else {
      toast.error("შეცდომა");
    }
  }

  // Fetch online users
  useEffect(() => {
    function fetchUsers() {
      fetch("/api/users")
        .then((r) => r.json())
        .then((data: PublicProfile[]) => setAllUsers(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
    fetchUsers();
    const interval = setInterval(fetchUsers, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch messages for active channel
  const fetchMessages = useCallback(async (channelId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/${encodeURIComponent(channelId)}`);
      if (!res.ok) throw new Error();
      const data: ChatMessage[] = await res.json();
      setMessagesByChannel((prev) => ({ ...prev, [channelId]: data }));
    } catch {
      setMessagesByChannel((prev) => ({ ...prev, [channelId]: [] }));
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages(activeChannelId);
  }, [activeChannelId, fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`chat:${activeChannelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${activeChannelId}`,
        },
        async (payload) => {
          const row = payload.new as { id: string; author_id: string; body: string; created_at: string; channel_id: string };
          // Skip if it's our own message (already optimistically added)
          if (row.author_id === currentUserId) return;

          // Fetch profile for the author
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, display_name, avatar_url, role")
            .eq("id", row.author_id)
            .maybeSingle();

          const newMessage: ChatMessage = {
            id: row.id,
            body: row.body,
            created_at: row.created_at,
            author_id: row.author_id,
            profiles: profile,
          };

          setMessagesByChannel((prev) => {
            const existing = prev[activeChannelId] ?? [];
            if (existing.some((m) => m.id === newMessage.id)) return prev;
            return { ...prev, [activeChannelId]: [...existing, newMessage] };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChannelId, currentUserId]);

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
    if (!currentUserId) {
      toast.error("გთხოვ შეხვიდე ანგარიშში მესიჯის გასაგზავნად.");
      return;
    }

    setSending(true);

    // Moderation
    try {
      const modRes = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const { toxic } = await modRes.json();
      if (toxic) {
        toast.error("მესიჯი დაიბლოკა — შეიცავს აკრძალულ კონტენტს.");
        setSending(false);
        return;
      }
    } catch {
      // allow through on moderation failure
    }

    try {
      const res = await fetch(`/api/chat/${encodeURIComponent(activeChannelId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!res.ok) throw new Error();
      const newMessage: ChatMessage = await res.json();
      setMessagesByChannel((prev) => ({
        ...prev,
        [activeChannelId]: [...(prev[activeChannelId] ?? []), newMessage],
      }));
      setInput("");
    } catch {
      toast.error("მესიჯის გაგზავნა ვერ მოხერხდა.");
    } finally {
      setSending(false);
    }
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

  // If the active channel is tied to a game, restrict members to users who favorited that game.
  const channelGameSlug = activeChannel?.gameSlug ?? null;
  const filteredUsers = channelGameSlug
    ? allUsers.filter((u) => (u.favoriteGameSlugs ?? []).includes(channelGameSlug))
    : allUsers;

  const onlineUsersList = filteredUsers.filter((u) => u.isOnline);
  const offlineUsersList = filteredUsers.filter((u) => !u.isOnline);
  const sortedUsers = [...onlineUsersList, ...offlineUsersList];

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
          {loadingMessages && messages.length === 0 && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> იტვირთება...
            </div>
          )}
          {!loadingMessages && messages.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              მესიჯი ჯერ არ არის — შენ იყავი პირველი 👇
            </div>
          )}
          {messages.map((m) => {
            const username = m.profiles?.username ?? "user";
            const displayName = m.profiles?.display_name ?? username;
            const isMe = m.author_id === currentUserId;
            const isAuthorAdmin = m.profiles?.role === "admin";
            const isVerified = m.profiles?.is_verified === true;
            return (
              <div key={m.id} className="group flex gap-3">
                <Link href={`/profile/${username}`} className="shrink-0 hover:ring-2 hover:ring-primary/40 rounded-full transition-all">
                  <UserAvatar
                    username={username}
                    displayName={displayName}
                    avatarUrl={m.profiles?.avatar_url}
                    size="sm"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <Link
                      href={`/profile/${username}`}
                      className={`flex items-center gap-1 text-sm font-medium hover:underline ${
                        isMe ? "text-accent" : isAuthorAdmin ? "text-rose-400" : ""
                      }`}
                    >
                      {displayName}
                      {isVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
                    </Link>
                    <span className="text-[10px] text-muted-foreground">{formatTime(m.created_at)}</span>
                    <span className="ml-auto flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      {!isMe && (
                        <ReportButton targetType="message" targetId={m.id} />
                      )}
                      {canModerate && (
                        <button
                          type="button"
                          onClick={() => deleteMessage(m.id)}
                          className="text-muted-foreground/60 transition-colors hover:text-rose-400"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">
                    <MentionText>{m.body}</MentionText>
                  </p>
                </div>
              </div>
            );
          })}
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
      <aside className="hidden border-l border-border/60 bg-sidebar/40 md:flex md:flex-col min-h-0">
        <div className="border-b border-border/60 p-4 shrink-0">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <UsersIcon className="h-3 w-3" /> ონლაინ — {onlineUsersList.length}
          </h3>
        </div>
        <ul className="flex-1 space-y-1 overflow-y-auto p-2 text-sm">
          {sortedUsers.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              მომხმარებლები არ არიან
            </li>
          )}
          {sortedUsers.map((u) => {
            const isAdmin = u.role === "admin";
            const label = u.displayName ?? u.username;
            return (
              <li key={u.username}>
                <Link
                  href={`/profile/${u.username}`}
                  className="flex items-center gap-2 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
                >
                  <span className={`h-2 w-2 rounded-full shrink-0 ${u.isOnline ? "bg-emerald-400" : "bg-amber-400/60"}`} />
                  <UserAvatar username={u.username} displayName={u.displayName ?? undefined} avatarUrl={u.avatarUrl} size="sm" className="h-5 w-5" />
                  <span className={`truncate ${isAdmin ? "text-rose-400 font-medium" : ""}`}>{label}</span>
                  {isAdmin && (
                    <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-rose-400/80">ADM</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
