"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, Globe, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type Msg = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

type Other = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
};

type Props = {
  conversationId: string;
  currentUserId: string;
  other: Other;
};

function timeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" });
}

export function ConversationClient({ conversationId, currentUserId, other }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchSmartReplies = useCallback(async (lastMsg: string) => {
    setLoadingReplies(true);
    try {
      const res = await fetch("/api/smart-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastMessage: lastMsg }),
      });
      const data = await res.json();
      setSmartReplies(data.replies ?? []);
    } catch {}
    setLoadingReplies(false);
  }, []);

  // Load messages
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (cancelled) return;
      const data = await res.json();
      const msgs: Msg[] = Array.isArray(data) ? data : [];
      setMessages(msgs);
      setLoading(false);
      // fetch smart replies for last received message
      const lastReceived = [...msgs].reverse().find((m) => m.sender_id !== currentUserId);
      if (lastReceived) fetchSmartReplies(lastReceived.body);
    })();
    return () => { cancelled = true; };
  }, [conversationId, currentUserId, fetchSmartReplies]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "conversation_messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const row = payload.new as Msg;
        if (row.sender_id === currentUserId) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev;
          return [...prev, row];
        });
        fetchSmartReplies(row.body);
        try { await fetch(`/api/conversations/${conversationId}/messages`); } catch {}
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUserId, fetchSmartReplies]);

  // scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async (e: React.FormEvent | null, overrideText?: string) => {
    if (e) e.preventDefault();
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;
    setSending(true);
    setSmartReplies([]);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) throw new Error();
      const newMsg: Msg = await res.json();
      setMessages((prev) => [...prev, newMsg]);
      setInput("");
    } catch {
      toast.error("ვერ გაიგზავნა");
    } finally {
      setSending(false);
    }
  };

  const translate = async (msgId: string, body: string) => {
    if (translations[msgId]) {
      setTranslations((prev) => { const n = { ...prev }; delete n[msgId]; return n; });
      return;
    }
    setTranslating((prev) => ({ ...prev, [msgId]: true }));
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body }),
      });
      const data = await res.json();
      if (data.translated) setTranslations((prev) => ({ ...prev, [msgId]: data.translated }));
    } catch {}
    setTranslating((prev) => { const n = { ...prev }; delete n[msgId]; return n; });
  };

  return (
    <Card className="flex h-[calc(100vh-10rem)] flex-col overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-border/60 p-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/messages"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <Link href={`/profile/${other.username}`} className="flex items-center gap-3">
          <UserAvatar username={other.username} displayName={other.displayName ?? undefined} avatarUrl={other.avatarUrl} size="sm" />
          <div>
            <div className="flex items-center gap-1 font-semibold">
              {other.displayName ?? other.username}
              {other.isVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
            </div>
            <p className="text-xs text-muted-foreground">@{other.username}</p>
          </div>
        </Link>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading && (
          <div className="flex justify-center pt-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            ჯერ მესიჯები არ არის. შენ იყავი პირველი 👇
          </p>
        )}
        {messages.map((m) => {
          const isMe = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`group relative max-w-[75%] ${isMe ? "" : "flex flex-col gap-1"}`}>
                <div className={`rounded-2xl px-3 py-2 text-sm ${
                  isMe
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-secondary/60"
                }`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  {translations[m.id] && (
                    <p className="mt-1 border-t border-current/20 pt-1 text-xs opacity-80 italic">
                      {translations[m.id]}
                    </p>
                  )}
                  <div className={`flex items-center justify-between gap-2 mt-0.5`}>
                    <p className={`text-[10px] ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {timeOnly(m.created_at)}
                    </p>
                    {!isMe && (
                      <button
                        onClick={() => translate(m.id, m.body)}
                        className="text-[10px] opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity flex items-center gap-0.5 text-muted-foreground"
                      >
                        {translating[m.id]
                          ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          : <Globe className="h-2.5 w-2.5" />}
                        {translations[m.id] ? "დამალვა" : "თარგმანი"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* smart replies */}
      {(smartReplies.length > 0 || loadingReplies) && (
        <div className="flex items-center gap-2 border-t border-border/40 px-3 py-2 overflow-x-auto scrollbar-hide">
          <Sparkles className="h-3 w-3 shrink-0 text-primary/60" />
          {loadingReplies
            ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            : smartReplies.map((r) => (
              <button
                key={r}
                onClick={() => send(null, r)}
                className="shrink-0 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary hover:bg-primary/15 transition-colors"
              >
                {r}
              </button>
            ))
          }
        </div>
      )}

      {/* composer */}
      <CardContent className="p-0">
        <form onSubmit={send} className="flex items-center gap-2 border-t border-border/60 p-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="დაწერე მესიჯი..."
            className="bg-background/40"
            autoFocus
          />
          <Button type="submit" disabled={!input.trim() || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
