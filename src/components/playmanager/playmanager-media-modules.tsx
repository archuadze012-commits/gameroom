"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, Loader2, MessageCircle, Send, Sparkles, UsersRound } from "lucide-react";
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

function initialOf(profile: Profile | null) {
  return displayName(profile).charAt(0).toUpperCase();
}

function ChatAvatar({ profile, size = 38 }: { profile: Profile | null; size?: number }) {
  const url = profile?.avatar_url;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt=""
        className="shrink-0 rounded-full object-cover ring-1 ring-white/14"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,rgba(52,211,153,0.34),rgba(16,84,60,0.28))] text-sm font-black text-emerald-100 ring-1 ring-emerald-300/24"
    >
      {initialOf(profile)}
    </div>
  );
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
      // Honor a ?c=<conversationId> deep-link (e.g. "contact seller" from the
      // transfer market) so the target thread opens directly.
      const requested = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('c')
        : null;
      const requestedValid = requested && list.some((item) => item.id === requested) ? requested : null;
      setActiveId((current) => requestedValid ?? current ?? list[0]?.id ?? null);
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
    <div className="grid min-h-[620px] grid-cols-1 overflow-hidden rounded-2xl border border-emerald-300/14 bg-black/34 lg:grid-cols-[320px_minmax(0,1fr)]">
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

// Maps a rejected chat POST into a Georgian, user-facing reason. Mirrors the
// error codes returned by /api/playmanager/chat (mute, moderation, rate limit).
function chatRejectionNotice(data: { error?: string; reason?: string } | null): string {
  switch (data?.error) {
    case "user_muted":
      return "თქვენ დროებით დადუმებული ხართ და ვერ წერთ.";
    case "content_blocked":
      return data?.reason ? `შეტყობინება დაიბლოკა: ${data.reason}` : "შეტყობინება დაიბლოკა მოდერაციამ.";
    case "rate_limited":
      return "ძალიან სწრაფად წერ — დაელოდე წამით.";
    case "message_too_long":
      return "შეტყობინება ძალიან გრძელია (მაქს. 500 სიმბოლო).";
    default:
      return "შეტყობინება ვერ გაიგზავნა. სცადე თავიდან.";
  }
}

export function PlayManagerGlobalChat() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
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
    setNotice(null);
    const response = await fetch("/api/playmanager/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data) {
      setMessages((current) => (current.some((item) => item.id === data.id) ? current : [...current, data as ChatMessage]));
      setDraft("");
    } else {
      // Surface why the message was rejected — mute, moderation, rate limit, etc.
      setNotice(chatRejectionNotice(data));
    }
    setSending(false);
  }

  const remaining = 500 - draft.length;

  return (
    <div className="flex h-[calc(100dvh-8rem)] max-h-[860px] min-h-[480px] flex-col overflow-hidden rounded-[26px] border border-emerald-300/16 bg-[linear-gradient(180deg,rgba(8,20,15,0.94),rgba(3,7,5,0.97))] shadow-[0_30px_70px_-34px_rgba(0,0,0,0.85)]">
      {/* Header */}
      <header className="relative flex items-center gap-3 border-b border-white/10 bg-[linear-gradient(135deg,rgba(16,52,38,0.6),rgba(6,14,10,0.3))] px-5 py-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-300/26 bg-emerald-300/12 text-emerald-100 shadow-[0_0_22px_-4px_rgba(52,211,153,0.55)]">
          <MessageCircle className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/60">Global chat</p>
          <h3 className="truncate text-lg font-black text-white">საერთო ჩატი</h3>
        </div>
        <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-emerald-300/24 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-black text-emerald-100">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          ცოცხალი
        </span>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-5 [background:radial-gradient(120%_60%_at_50%_0%,rgba(52,211,153,0.05),transparent_60%)]"
      >
        {loading ? (
          <div className="grid h-full min-h-[360px] place-items-center text-white/40">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="grid h-full min-h-[360px] place-items-center px-6 text-center">
            <div>
              <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl border border-emerald-300/22 bg-emerald-300/8 text-emerald-200/80">
                <Sparkles className="h-7 w-7" />
              </span>
              <p className="text-base font-black text-white">ჯერ საუბარი არ დაწყებულა</p>
              <p className="mx-auto mt-1.5 max-w-xs text-sm font-bold leading-6 text-white/45">
                დაწერე პირველი მესიჯი — ყველა მენეჯერი დაინახავს.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message, i) => {
              const profile = getProfile(message);
              const mine = message.author_id === currentUserId;
              const prev = messages[i - 1];
              const grouped =
                !!prev &&
                prev.author_id === message.author_id &&
                !!message.created_at &&
                !!prev.created_at &&
                new Date(message.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;

              return (
                <div
                  key={message.id}
                  className={`flex items-end gap-2.5 ${grouped ? "mt-0.5" : "mt-4"} ${mine ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* avatar gutter (others only) */}
                  {!mine ? (
                    grouped ? (
                      <span className="w-[38px] shrink-0" />
                    ) : (
                      <ChatAvatar profile={profile} />
                    )
                  ) : null}

                  <div className={`flex max-w-[76%] flex-col ${mine ? "items-end" : "items-start"}`}>
                    {!mine && !grouped ? (
                      <span className="mb-1 ml-1 inline-flex items-center gap-1 text-[11px] font-black tracking-wide text-emerald-100/70">
                        {displayName(profile)}
                        {profile?.is_verified ? <BadgeCheck className="h-3 w-3 text-emerald-300" /> : null}
                      </span>
                    ) : null}
                    <div
                      className={`group relative px-3.5 py-2.5 text-sm font-bold leading-6 shadow-[0_8px_22px_-16px_rgba(0,0,0,0.9)] ${
                        mine
                          ? `rounded-2xl ${grouped ? "rounded-tr-md" : "rounded-br-md"} bg-[linear-gradient(135deg,rgba(52,211,153,0.26),rgba(16,84,60,0.22))] text-emerald-50 ring-1 ring-emerald-300/22`
                          : `rounded-2xl ${grouped ? "rounded-tl-md" : "rounded-bl-md"} bg-white/[0.055] text-white ring-1 ring-white/8`
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      <span
                        className={`mt-0.5 block text-[10px] font-black ${mine ? "text-emerald-100/45" : "text-white/30"}`}
                      >
                        {timeLabel(message.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-white/10 bg-[linear-gradient(0deg,rgba(8,18,13,0.7),rgba(0,0,0,0.1))] p-3.5">
        {notice ? (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-red-400/26 bg-red-400/[0.08] px-3 py-2 text-[12px] font-bold text-red-200">
            <span aria-hidden>⚠️</span>
            <span>{notice}</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] py-1.5 pl-4 pr-1.5 transition focus-within:border-emerald-300/40 focus-within:bg-white/[0.06]">
          <input
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (notice) setNotice(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="დაწერე საერთო ჩატში..."
            maxLength={500}
            className="h-10 min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/28"
          />
          {draft.length > 400 ? (
            <span className={`shrink-0 text-[10px] font-black tabular-nums ${remaining <= 0 ? "text-red-400" : "text-white/35"}`}>
              {remaining}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={!draft.trim() || sending}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,rgba(52,211,153,0.9),rgba(16,122,84,0.9))] text-black shadow-[0_0_20px_-6px_rgba(52,211,153,0.8)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            aria-label="გაგზავნა"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
