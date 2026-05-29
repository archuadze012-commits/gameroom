"use client";

import { useEffect, useRef, useState, useCallback, useActionState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, Globe, Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { sendMessageAction, deleteConversationAction, type SendMessageState } from "../actions";

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
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [isDeleting, startDeleteTransition] = useTransition();
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const initialSendState: SendMessageState = { success: false };
  const [sendState, sendFormAction, isSending] = useActionState(sendMessageAction, initialSendState);

  // Handle send action response
  useEffect(() => {
    if (sendState.success && sendState.newMsg) {
      setMessages((prev) => [...prev, sendState.newMsg]);
      setInput("");
      setSmartReplies([]);
    } else if (sendState.message && !sendState.success) {
      toast.error(sendState.message);
    }
  }, [sendState]);

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
    const channelName = `dm:${conversationId}-${Math.random().toString(36).slice(2, 11)}`;
    
    const channel = supabase
      .channel(channelName)
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

  const handleSmartReply = (reply: string) => {
    const formData = new FormData();
    formData.append("conversationId", conversationId);
    formData.append("body", reply);
    // Programmatically dispatch the action using startTransition to bypass the form
    // In React 19, startTransition can wrap Server Actions
    import("react").then(({ startTransition: reactStartTransition }) => {
       reactStartTransition(() => {
           sendFormAction(formData);
       });
    });
  };

  const deleteConversation = () => {
    if (!confirm("მიმოწერა წაიშლება სამუდამოდ. დარწმუნებული ხარ?")) return;
    startDeleteTransition(async () => {
      const res = await deleteConversationAction(conversationId);
      if (res.success) {
        router.push("/messages");
      } else {
        toast.error(res.message || "ვერ წაიშალა");
      }
    });
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
    <Card className="flex h-[calc(100vh-10rem)] flex-col overflow-hidden" style={{ background: "rgba(8,6,15,0.95)", border: "1px solid rgba(236,72,153,0.3)", boxShadow: "0 0 24px rgba(236,72,153,0.15)" }}>
      {/* header */}
      <div className="flex items-center gap-3 p-3" style={{ borderBottom: "1px solid rgba(236,72,153,0.2)" }}>
        <Button asChild variant="ghost" size="icon">
          <Link href="/messages"><ArrowLeft className="h-4 w-4" style={{ color: "#ffffff", filter: "drop-shadow(0 0 5px rgba(236,72,153,0.8))" }} /></Link>
        </Button>
        <Link href={`/profile/${other.username}`} className="flex flex-1 items-center gap-3">
          <UserAvatar username={other.username} displayName={other.displayName ?? undefined} avatarUrl={other.avatarUrl} size="sm" />
          <div>
            <div className="flex items-center gap-1 font-semibold" style={{ color: "#ffffff", textShadow: "0 0 8px rgba(236,72,153,0.9), 0 0 18px rgba(236,72,153,0.5)" }}>
              {other.displayName ?? other.username}
              {other.isVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
            </div>
          </div>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={deleteConversation}
          disabled={isDeleting}
          className="shrink-0 text-muted-foreground hover:text-destructive"
          title="მიმოწერის წაშლა"
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
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
                <div
                  className={`rounded-2xl px-3 py-2 text-sm ${isMe ? "rounded-br-sm" : "rounded-bl-sm bg-secondary/60"}`}
                  style={isMe ? {
                    background: "rgba(236,72,153,0.18)",
                    border: "1px solid rgba(236,72,153,0.45)",
                    boxShadow: "0 0 14px rgba(236,72,153,0.3), inset 0 0 10px rgba(236,72,153,0.08)",
                    backdropFilter: "blur(8px)",
                  } : undefined}
                >
                  <p
                    className="whitespace-pre-wrap break-words"
                    style={isMe
                      ? { color: "#ffffff", textShadow: "0 0 6px rgba(236,72,153,0.9), 0 0 14px rgba(236,72,153,0.5)" }
                      : { color: "rgba(236,72,153,1)", textShadow: "0 0 6px rgba(255,255,255,0.9), 0 0 14px rgba(255,255,255,0.5)" }
                    }
                  >
                    {m.body}
                  </p>
                  {translations[m.id] && (
                    <p className="mt-1 border-t border-current/20 pt-1 text-xs opacity-80 italic">
                      {translations[m.id]}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p
                      className="text-[10px]"
                      style={isMe
                        ? { color: "rgba(255,255,255,0.6)", textShadow: "0 0 6px rgba(236,72,153,0.6)" }
                        : { color: "rgba(236,72,153,0.7)", textShadow: "0 0 6px rgba(255,255,255,0.5)" }
                      }
                    >
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
                onClick={() => handleSmartReply(r)}
                className="shrink-0 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary hover:bg-primary/15 transition-colors"
                disabled={isSending}
              >
                {r}
              </button>
            ))
          }
        </div>
      )}

      {/* composer */}
      <CardContent className="p-0">
        <form action={sendFormAction} className="flex items-center gap-2 p-3" style={{ borderTop: "1px solid rgba(236,72,153,0.2)" }}>
          <input type="hidden" name="conversationId" value={conversationId} />
          <Input
            name="body"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="დაწერე მესიჯი..."
            className="bg-background/40"
            style={{ color: "#ffffff", textShadow: "0 0 6px rgba(236,72,153,0.7)" }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px rgba(236,72,153,0.5), 0 0 14px rgba(236,72,153,0.4)"; e.currentTarget.style.borderColor = "rgba(236,72,153,0.9)"; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = ""; }}
            autoFocus
            disabled={isSending}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isSending}
            style={{
              background: "rgba(236,72,153,0.18)",
              border: "1px solid rgba(236,72,153,0.45)",
              boxShadow: "0 0 14px rgba(236,72,153,0.3), inset 0 0 10px rgba(236,72,153,0.08)",
              backdropFilter: "blur(8px)",
              color: "#ffffff",
            }}
          >
            {isSending
              ? <Loader2 className="h-4 w-4 animate-spin" style={{ filter: "drop-shadow(0 0 5px rgba(236,72,153,0.9))" }} />
              : <Send className="h-4 w-4" style={{ filter: "drop-shadow(0 0 5px rgba(236,72,153,0.9))" }} />
            }
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
