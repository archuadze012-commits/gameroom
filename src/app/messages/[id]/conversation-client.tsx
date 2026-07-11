"use client";

import { useEffect, useRef, useState, useCallback, useActionState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, Globe, Sparkles, Trash2 } from "lucide-react";
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

function mergeMessages(current: Msg[], incoming: Msg[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => byId.set(message.id, message));
  return [...byId.values()]
    .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
    .slice(-300);
}

export function ConversationClient({ conversationId, currentUserId, other }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [input, setInput] = useState("");
  const [isDeleting, startDeleteTransition] = useTransition();
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const initialSendState: SendMessageState = { success: false };
  const [sendState, sendFormAction, isSending] = useActionState(sendMessageAction, initialSendState);

  // The action response is the fastest path for our own messages. Realtime
  // remains a second path, while reloadKey is a tiny server-confirmed fallback.
  useEffect(() => {
    if (sendState.success && sendState.newMsg) {
      const msg = sendState.newMsg;
      queueMicrotask(() => {
        setMessages((current) => mergeMessages(current, [msg]));
        setInput("");
        setSmartReplies([]);
        setReloadKey((current) => current + 1);
      });
    } else if (sendState.message && !sendState.success) {
      toast.error(sendState.message);
    }
  }, [sendState.success, sendState.newMsg, sendState.message]);

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
      setLoadError(false);
      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`);
        if (cancelled) return;
        // A 401/403/500 would otherwise parse to a non-array and render the
        // misleading "no messages yet" empty state over a real thread.
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const msgs: Msg[] = Array.isArray(data) ? data : [];
        setMessages((current) => mergeMessages(current, msgs));
        // fetch smart replies for last received message
        const lastReceived = [...msgs].reverse().find((m) => m.sender_id !== currentUserId);
        if (lastReceived) fetchSmartReplies(lastReceived.body);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [conversationId, currentUserId, fetchSmartReplies, reloadKey]);

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
        setMessages((current) => mergeMessages(current, [row]));
        if (row.sender_id === currentUserId) return;
        fetchSmartReplies(row.body);
        // Mark read via the lightweight PATCH instead of re-fetching the whole
        // history (which was downloaded and discarded on every incoming message).
        try { await fetch(`/api/conversations/${conversationId}`, { method: "PATCH" }); } catch {}
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
    <div className="pubg-loadout-link relative flex h-full min-w-0 max-w-full flex-col overflow-hidden" data-variant="support">
      <div className="pubg-loadout-card relative flex h-full flex-col overflow-hidden !p-0">
        {/* Decorators */}
        <span aria-hidden className="pubg-loadout-field absolute inset-0" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px]" />
        <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-16 w-16 opacity-30" />
        <span aria-hidden className="pubg-loadout-sweep absolute inset-y-0 left-0 w-1/3" />

        {/* header */}
        <div className="relative z-10 flex min-w-0 items-center gap-3 border-b border-white/[0.07] bg-[var(--gr-bg-0)]/60 p-3 backdrop-blur-md sm:gap-4 sm:p-4">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full bg-white/5 hover:bg-white/10 hover:text-[var(--gr-cyan-glow)]">
            <Link href="/messages"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <Link href={`/profile/${other.username}`} className="group flex min-w-0 flex-1 items-center gap-3">
            <UserAvatar username={other.username} displayName={other.displayName ?? undefined} avatarUrl={other.avatarUrl} size="md" />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5 font-display text-base font-black uppercase tracking-wide text-[var(--gr-text)] drop-shadow-sm transition-colors group-hover:text-[var(--gr-cyan-glow)] sm:text-lg">
                <span className="truncate">{other.displayName ?? other.username}</span>
                {other.isVerified && <VerifiedBadge className="h-4 w-4" />}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--gr-text-dim)]">@{other.username}</p>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={deleteConversation}
            disabled={isDeleting}
            className="h-10 w-10 shrink-0 rounded-full bg-white/5 text-[var(--gr-text-dim)] hover:bg-red-500/20 hover:text-red-400"
            title="მიმოწერის წაშლა"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="relative z-10 flex-1 space-y-4 overflow-x-hidden overflow-y-auto p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 sm:p-5">
          {loading && (
            <div className="flex justify-center pt-8 text-[var(--gr-text-dim)]">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {!loading && loadError && (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--gr-text-dim)]">
                მესიჯების ჩატვირთვა ვერ მოხერხდა
              </p>
              <Button
                variant="ghost"
                onClick={() => setReloadKey((k) => k + 1)}
                className="rounded-full border border-[var(--gr-cyan-glow)]/30 bg-[var(--gr-cyan-glow)]/10 px-6 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gr-cyan-glow)] hover:bg-[var(--gr-cyan-glow)]/20"
              >
                ხელახლა ცდა
              </Button>
            </div>
          )}
          {!loading && !loadError && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="mb-4 h-12 w-12 text-[var(--gr-cyan-glow)]/40 drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]" />
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--gr-text-dim)]">
                ჯერ მესიჯები არ არის.<br/>შენ იყავი პირველი.
              </p>
            </div>
          )}
          {messages.map((m) => {
            const isMe = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`group relative max-w-[80%] ${isMe ? "" : "flex flex-col gap-1"}`}>
                  {/* Message bubble */}
                  <div
                    className={`msg-bubble relative overflow-hidden px-4 py-3 text-[15px] text-[var(--gr-text)] ${
                      isMe
                        ? "msg-bubble--mine rounded-[16px] rounded-br-[3px]"
                        : "msg-bubble--theirs rounded-[16px] rounded-bl-[3px]"
                    }`}
                  >
                    <p className="relative whitespace-pre-wrap break-words leading-relaxed font-medium">
                      {m.body}
                    </p>
                    {translations[m.id] && (
                      <p className="relative mt-2 border-t border-white/[0.07] pt-2 text-sm text-[var(--gr-cyan-glow)]/80 italic">
                        {translations[m.id]}
                      </p>
                    )}
                    <div className="relative mt-1 flex items-center justify-between gap-3">
                      <p className={`text-[10px] font-black tracking-[0.18em] uppercase ${isMe ? "text-[var(--gr-violet-hi)]/70" : "text-[var(--gr-cyan-glow)]/55"}`}>
                        {timeOnly(m.created_at)}
                      </p>
                      {!isMe && (
                        <button
                          onClick={() => translate(m.id, m.body)}
                          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--gr-cyan-glow)]/60 opacity-0 transition-opacity hover:text-[var(--gr-cyan-glow)] group-hover:opacity-100"
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
          <div className="relative z-10 flex max-w-full items-center gap-3 overflow-x-auto border-t border-white/[0.07] bg-[var(--gr-bg-0)]/40 px-4 py-3 scrollbar-hide backdrop-blur-md">
            <Sparkles className="h-4 w-4 shrink-0 text-[var(--gr-cyan-glow)] drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            {loadingReplies
              ? <Loader2 className="h-4 w-4 animate-spin text-[var(--gr-text-dim)]" />
              : smartReplies.map((r) => (
                <button
                  key={r}
                  onClick={() => handleSmartReply(r)}
                  className="shrink-0 rounded-full border border-[var(--gr-violet-hi)]/30 bg-[var(--gr-violet)]/10 px-4 py-1.5 text-[12px] font-black tracking-[0.12em] text-[var(--gr-violet-hi)] transition-all hover:bg-[var(--gr-violet)]/20 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:scale-105 disabled:opacity-50"
                  disabled={isSending}
                >
                  {r}
                </button>
              ))
            }
          </div>
        )}

        {/* composer */}
        <div className="relative z-10 border-t border-white/[0.07] bg-[var(--gr-bg-0)]/60 p-3 backdrop-blur-md sm:p-4">
          <form action={sendFormAction} className="flex min-w-0 items-center gap-2 sm:gap-3">
            <input type="hidden" name="conversationId" value={conversationId} />
            {/* text-base (16px) is deliberate: iOS Safari zooms the page in when a
                focused input's font-size is < 16px, which on this fixed-height chat
                view clips the right edge and spawns both scrollbars. */}
            <Input
              name="body"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="მესიჯის ტექსტი"
              placeholder="დაწერე მესიჯი..."
              className="h-12 rounded-full border-white/[0.07] bg-white/5 px-6 text-base font-medium text-[var(--gr-text)] shadow-inner transition-all focus-visible:border-[var(--gr-cyan-glow)]/50 focus-visible:bg-white/10 focus-visible:ring-1 focus-visible:ring-[var(--gr-cyan-glow)]/50 focus-visible:shadow-[0_0_20px_rgba(34,211,238,0.15)]"
              autoFocus
              disabled={isSending}
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isSending}
              className="h-12 w-12 shrink-0 rounded-full border border-[var(--gr-violet-hi)]/40 bg-[linear-gradient(135deg,var(--gr-violet),var(--gr-cyan-glow))] text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] disabled:opacity-50"
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
