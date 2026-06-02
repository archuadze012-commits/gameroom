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
      const msg = sendState.newMsg;
      queueMicrotask(() => {
        setMessages((prev) => [...prev, msg]);
        setInput("");
        setSmartReplies([]);
      });
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
    <div className="relative flex h-[calc(100vh-8rem)] w-full flex-col overflow-hidden rounded-[24px] p-[1.5px] bg-gradient-to-br from-[#00d0ff] via-[#6366f1] to-[#f43f5e] shadow-[0_0_40px_rgba(99,102,241,0.2)]">
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[22.5px] bg-[#05050f]">
        
        {/* Ambient background glow inside chat */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.1),transparent_60%)]" />

        {/* header */}
        <div className="relative z-10 flex items-center gap-4 bg-black/60 p-4 border-b border-white/10 backdrop-blur-md">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full bg-white/5 hover:bg-white/10 hover:text-pink-400">
            <Link href="/messages"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <Link href={`/profile/${other.username}`} className="group flex flex-1 items-center gap-3">
            <UserAvatar username={other.username} displayName={other.displayName ?? undefined} avatarUrl={other.avatarUrl} size="md" />
            <div>
              <div className="flex items-center gap-1.5 font-display text-lg font-black uppercase tracking-wide text-white drop-shadow-sm group-hover:text-pink-400 transition-colors">
                {other.displayName ?? other.username}
                {other.isVerified && <VerifiedBadge className="h-4 w-4" />}
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">@{other.username}</p>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={deleteConversation}
            disabled={isDeleting}
            className="h-10 w-10 shrink-0 rounded-full bg-white/5 text-white/50 hover:bg-red-500/20 hover:text-red-400"
            title="მიმოწერის წაშლა"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="relative z-10 flex-1 space-y-4 overflow-y-auto p-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {loading && (
            <div className="flex justify-center pt-8 text-white/30">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="mb-4 h-12 w-12 text-pink-500/40 drop-shadow-[0_0_20px_rgba(236,72,153,0.5)]" />
              <p className="text-sm font-bold uppercase tracking-widest text-white/40">
                ჯერ მესიჯები არ არის.<br/>შენ იყავი პირველი.
              </p>
            </div>
          )}
          {messages.map((m) => {
            const isMe = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`group relative max-w-[80%] ${isMe ? "" : "flex flex-col gap-1"}`}>
                  <div
                    className={`relative rounded-2xl px-4 py-3 text-[15px] shadow-lg backdrop-blur-md ${
                      isMe 
                        ? "rounded-br-sm border border-pink-500/30 bg-gradient-to-br from-pink-500/20 to-violet-500/20 shadow-[0_4px_20px_rgba(236,72,153,0.15)] text-white" 
                        : "rounded-bl-sm border border-white/10 bg-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] text-white/90"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed font-medium">
                      {m.body}
                    </p>
                    {translations[m.id] && (
                      <p className="mt-2 border-t border-white/10 pt-2 text-sm text-cyan-200/80 italic">
                        {translations[m.id]}
                      </p>
                    )}
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <p className={`text-[10px] font-bold tracking-widest uppercase ${isMe ? "text-pink-200/50" : "text-white/30"}`}>
                        {timeOnly(m.created_at)}
                      </p>
                      {!isMe && (
                        <button
                          onClick={() => translate(m.id, m.body)}
                          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-cyan-400/60 opacity-0 transition-opacity hover:text-cyan-400 group-hover:opacity-100"
                        >
                          {translating[m.id]
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Globe className="h-3 w-3" />}
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
          <div className="relative z-10 flex items-center gap-3 border-t border-white/5 bg-black/40 px-4 py-3 overflow-x-auto scrollbar-hide backdrop-blur-md">
            <Sparkles className="h-4 w-4 shrink-0 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            {loadingReplies
              ? <Loader2 className="h-4 w-4 animate-spin text-white/30" />
              : smartReplies.map((r) => (
                <button
                  key={r}
                  onClick={() => handleSmartReply(r)}
                  className="shrink-0 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-[12px] font-black tracking-wider text-cyan-400 transition-all hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:scale-105 disabled:opacity-50"
                  disabled={isSending}
                >
                  {r}
                </button>
              ))
            }
          </div>
        )}

        {/* composer */}
        <div className="relative z-10 bg-black/60 p-4 border-t border-white/10 backdrop-blur-md">
          <form action={sendFormAction} className="flex items-center gap-3">
            <input type="hidden" name="conversationId" value={conversationId} />
            <Input
              name="body"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="დაწერე მესიჯი..."
              className="h-12 rounded-full border-white/10 bg-white/5 px-6 text-[15px] font-medium text-white shadow-inner transition-all focus-visible:border-pink-500/50 focus-visible:bg-white/10 focus-visible:ring-1 focus-visible:ring-pink-500/50 focus-visible:shadow-[0_0_20px_rgba(236,72,153,0.2)]"
              autoFocus
              disabled={isSending}
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isSending}
              className="h-12 w-12 shrink-0 rounded-full border border-pink-500/40 bg-[linear-gradient(135deg,#ec4899,#8b5cf6)] text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] disabled:opacity-50"
            >
              {isSending
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : <Send className="h-5 w-5 ml-0.5" />
              }
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}
