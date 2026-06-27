"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, UsersRound } from "lucide-react";
import { sendMessageAction, type SendMessageState } from "@/app/messages/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Profile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean;
};

type ConversationItem = {
  id: string;
  otherId: string;
  other: Profile | null;
  lastMessage: { body: string; created_at: string | null; sender_id: string } | null;
  unread: number;
  last_message_at: string | null;
};

type DirectMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

type ChatMessage = {
  id: string;
  author_id: string;
  body: string;
  created_at: string | null;
  profiles: Profile | Profile[] | null;
};

function getProfile(row: ChatMessage) {
  return Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles;
}

function displayName(profile: Profile | null) {
  return profile?.display_name || profile?.username || "Manager";
}

function timeLabel(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" });
}

export function PlayManagerDirectMessages() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialSendState: SendMessageState = { success: false };
  const [sendState, sendFormAction, isSending] = useActionState(sendMessageAction, initialSendState);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) ?? null,
    [activeId, conversations]
  );

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingConversations(true);
      const response = await fetch("/api/conversations");
      const data = await response.json().catch(() => []);
      if (cancelled) return;
      const list = Array.isArray(data) ? (data as ConversationItem[]) : [];
      setConversations(list);
      setActiveId((current) => current ?? list[0]?.id ?? null);
      setLoadingConversations(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeId) {
      return;
    }
    let cancelled = false;
    async function loadMessages() {
      setLoadingMessages(true);
      const response = await fetch(`/api/conversations/${activeId}/messages`);
      const data = await response.json().catch(() => []);
      if (cancelled) return;
      setMessages(Array.isArray(data) ? (data as DirectMessage[]) : []);
      setLoadingMessages(false);
    }
    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    if (!activeId || !currentUserId) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`pm-dm:${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          const row = payload.new as DirectMessage;
          setMessages((current) => (current.some((item) => item.id === row.id) ? current : [...current, row]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId, currentUserId]);

  useEffect(() => {
    if (sendState.success && sendState.newMsg) {
      queueMicrotask(() => {
        setMessages((current) =>
          current.some((item) => item.id === sendState.newMsg?.id) ? current : [...current, sendState.newMsg!]
        );
        setDraft("");
      });
    }
  }, [sendState]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, activeId]);

  return (
    <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-emerald-300/14 bg-black/34 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="border-b border-white/10 bg-black/24 lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
          <UsersRound className="h-5 w-5 text-emerald-200" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Direct messages</p>
            <h3 className="text-base font-black text-white">პირადი მიმოწერები</h3>
          </div>
        </div>
        <div className="max-h-[554px] overflow-y-auto p-3">
          {loadingConversations ? (
            <div className="grid h-24 place-items-center text-white/40">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm font-bold text-white/45">
              ჯერ პირადი მიმოწერა არ გაქვს.
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((item) => {
                const active = item.id === activeId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-emerald-300/34 bg-emerald-300/12"
                        : "border-white/8 bg-white/[0.03] hover:border-emerald-300/18 hover:bg-emerald-300/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-black text-white">{displayName(item.other)}</p>
                      {item.unread > 0 ? (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-emerald-300 px-1 text-[10px] font-black text-black">
                          {item.unread}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-xs font-bold text-white/45">
                      {item.lastMessage?.body ?? "ცარიელი მიმოწერა"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col">
        <header className="flex h-16 items-center border-b border-white/10 px-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/50">Conversation</p>
            <h3 className="truncate text-lg font-black text-white">
              {activeConversation ? displayName(activeConversation.other) : "მიმოწერა აირჩიე"}
            </h3>
          </div>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {loadingMessages ? (
            <div className="grid h-full min-h-[360px] place-items-center text-white/40">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !activeId ? (
            <div className="grid h-full min-h-[360px] place-items-center text-sm font-bold text-white/42">
              აირჩიე მიმოწერა მარცხნიდან.
            </div>
          ) : messages.length === 0 ? (
            <div className="grid h-full min-h-[360px] place-items-center text-sm font-bold text-white/42">
              ჯერ მესიჯები არ არის.
            </div>
          ) : (
            messages.map((message) => {
              const mine = message.sender_id === currentUserId;
              return (
                <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[76%] rounded-2xl px-4 py-3 ${
                      mine
                        ? "rounded-br-md bg-emerald-300/16 text-emerald-50"
                        : "rounded-bl-md bg-white/[0.06] text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm font-bold leading-6">{message.body}</p>
                    <p className="mt-1 text-right text-[10px] font-black text-white/36">{timeLabel(message.created_at)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form action={sendFormAction} className="flex items-center gap-3 border-t border-white/10 bg-black/26 p-4">
          <input type="hidden" name="conversationId" value={activeId ?? ""} />
          <input
            name="body"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={!activeId || isSending}
            placeholder="დაწერე მესიჯი..."
            className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/28 focus:border-emerald-300/36"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!activeId || !draft.trim() || isSending}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-emerald-300/22 bg-emerald-300/12 text-emerald-100 transition hover:bg-emerald-300/18 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="გაგზავნა"
          >
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
      </section>
    </div>
  );
}

export function PlayManagerGlobalChat() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const response = await fetch("/api/playmanager/chat");
      const data = await response.json().catch(() => []);
      if (cancelled) return;
      setMessages(Array.isArray(data) ? (data as ChatMessage[]) : []);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("pm-global-chat")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: "channel_id=eq.playmanager_global",
        },
        async () => {
          const response = await fetch("/api/playmanager/chat");
          const data = await response.json().catch(() => []);
          if (Array.isArray(data)) setMessages(data as ChatMessage[]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const response = await fetch("/api/playmanager/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data) {
      setMessages((current) => (current.some((item) => item.id === data.id) ? current : [...current, data as ChatMessage]));
      setDraft("");
    }
    setSending(false);
  }

  return (
    <div className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-emerald-300/14 bg-black/34">
      <header className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <MessageCircle className="h-5 w-5 text-emerald-200" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Global chat</p>
          <h3 className="text-lg font-black text-white">საერთო ჩატი</h3>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <div className="grid h-full min-h-[420px] place-items-center text-white/40">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="grid h-full min-h-[420px] place-items-center text-sm font-bold text-white/42">
            ჯერ საერთო ჩატში არაფერი წერია.
          </div>
        ) : (
          messages.map((message) => {
            const profile = getProfile(message);
            const mine = message.author_id === currentUserId;
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] ${mine ? "text-right" : "text-left"}`}>
                  {!mine ? (
                    <p className="mb-1 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-100/55">
                      {displayName(profile)}
                    </p>
                  ) : null}
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      mine
                        ? "rounded-br-md bg-emerald-300/16 text-emerald-50"
                        : "rounded-bl-md bg-white/[0.06] text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm font-bold leading-6">{message.body}</p>
                    <p className="mt-1 text-[10px] font-black text-white/34">{timeLabel(message.created_at)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-white/10 bg-black/26 p-4">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="დაწერე საერთო ჩატში..."
          maxLength={500}
          className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/28 focus:border-emerald-300/36"
        />
        <button
          type="button"
          onClick={() => void sendMessage()}
          disabled={!draft.trim() || sending}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-emerald-300/22 bg-emerald-300/12 text-emerald-100 transition hover:bg-emerald-300/18 disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="გაგზავნა"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
