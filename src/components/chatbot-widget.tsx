"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  X,
  Maximize2,
  ArrowLeft,
  Send,
  Loader2,
  Inbox,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Preview = {
  conversationId: string;
  senderName: string;
  senderAvatar: string | null;
  body: string;
};

type ConvOther = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type Conversation = {
  id: string;
  other: ConvOther | null;
  lastMessage: { body: string; created_at: string; sender_id: string } | null;
  unread: number;
  last_message_at: string;
};

type Msg = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type OpenedConvo = {
  id: string;
  other: ConvOther;
};

function nameFor(p: { display_name: string | null; username: string } | null) {
  return p?.display_name ?? p?.username ?? "user";
}

function timeShort(iso: string) {
  return new Date(iso).toLocaleTimeString("ka-GE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatbotWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openedConvo, setOpenedConvo] = useState<OpenedConvo | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [unread, setUnread] = useState(0);
  const userIdRef = useRef<string | null>(null);
  const openRef = useRef(open);
  const openedConvoRef = useRef<OpenedConvo | null>(openedConvo);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    openRef.current = open;
  }, [open]);
  useEffect(() => {
    openedConvoRef.current = openedConvo;
  }, [openedConvo]);

  const loadConversations = useCallback(async () => {
    try {
      setLoadingList(true);
      const res = await fetch("/api/conversations");
      if (!res.ok) return;
      const data = await res.json();
      const list: Conversation[] = Array.isArray(data) ? data : [];
      setConversations(list);
      setUnread(list.reduce((sum, c) => sum + (c.unread ?? 0), 0));
    } catch {
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadMessages = useCallback(async (convoId: string) => {
    try {
      setLoadingMsgs(true);
      const res = await fetch(`/api/conversations/${convoId}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch {
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  // Initial load + realtime
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    // Use a unique name for this mount to avoid "already subscribed" errors in Strict Mode
    const channelName = `messenger-bubble-${Math.random().toString(36).slice(2, 11)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
        },
        async (payload) => {
          const msg = payload.new as {
            id: string;
            conversation_id: string;
            sender_id: string;
            body: string;
            created_at: string;
          };
          if (msg.sender_id === userIdRef.current) return;

          // If the matching convo is currently open in the bubble, append directly
          if (
            openRef.current &&
            openedConvoRef.current?.id === msg.conversation_id
          ) {
            setMessages((prev) =>
              prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
            );
          }

          // Refresh list (unread counts, last message)
          loadConversations();

          // Show preview only when widget is closed
          if (!openRef.current) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username, display_name, avatar_url")
              .eq("id", msg.sender_id)
              .maybeSingle();

            const senderName =
              profile?.display_name ?? profile?.username ?? "ვინმე";

            showPreview({
              conversationId: msg.conversation_id,
              senderName,
              senderAvatar: profile?.avatar_url ?? null,
              body: msg.body,
            });
          }
        }
      )
      .subscribe();

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;
      loadConversations();
    }

    init();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations]);

  // When opening a conversation, load messages and mark read on the server
  useEffect(() => {
    if (!openedConvo) return;
    loadMessages(openedConvo.id);
  }, [openedConvo, loadMessages]);

  // Auto-scroll messages to bottom
  useEffect(() => {
    if (msgsScrollRef.current) {
      msgsScrollRef.current.scrollTo({
        top: msgsScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length, openedConvo?.id]);

  function showPreview(p: Preview) {
    setPreview(p);
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => setPreview(null), 5000);
  }

  function dismissPreview() {
    setPreview(null);
    if (previewTimer.current) clearTimeout(previewTimer.current);
  }

  const toggleOpen = () => {
    if (!open) {
      // Opening — refresh list, dismiss preview
      loadConversations();
      dismissPreview();
    } else {
      // Closing — reset view
      setOpenedConvo(null);
    }
    setOpen((v) => !v);
  };

  const openConversation = (c: Conversation) => {
    if (!c.other) return;
    setOpenedConvo({ id: c.id, other: c.other });
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openedConvo) return;
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch(
        `/api/conversations/${openedConvo.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: text }),
        }
      );
      if (!res.ok) throw new Error();
      const newMsg: Msg = await res.json();
      setMessages((prev) => [...prev, newMsg]);
      setInput("");
    } catch {
    } finally {
      setSending(false);
    }
  };

  const maximize = () => {
    if (openedConvo) router.push(`/messages/${openedConvo.id}`);
    else router.push("/messages");
    setOpen(false);
    setOpenedConvo(null);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Preview popup (only when closed) */}
      {!open && preview && (
        <div
          className="flex w-72 cursor-pointer items-start gap-3 rounded-2xl border border-primary/30 bg-card px-4 py-3 shadow-2xl transition-colors hover:border-primary/60"
          onClick={() => {
            setOpenedConvo({
              id: preview.conversationId,
              other: {
                username: preview.senderName,
                display_name: preview.senderName,
                avatar_url: preview.senderAvatar,
              },
            });
            setOpen(true);
            dismissPreview();
          }}
        >
          <Avatar className="h-9 w-9 shrink-0 border border-border/60">
            <AvatarImage src={preview.senderAvatar ?? undefined} />
            <AvatarFallback className="bg-primary/15 text-xs text-primary">
              {preview.senderName.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">
              {preview.senderName}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {preview.body}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismissPreview();
            }}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Floating window */}
      {open && (
        <div className="flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-primary/10 px-3 py-2.5">
            {openedConvo ? (
              <>
                <button
                  onClick={() => setOpenedConvo(null)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="უკან"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Avatar className="h-7 w-7 shrink-0 border border-border/60">
                    <AvatarImage
                      src={openedConvo.other.avatar_url ?? undefined}
                    />
                    <AvatarFallback className="bg-primary/15 text-[10px] text-primary">
                      {nameFor(openedConvo.other).slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-semibold">
                    {nameFor(openedConvo.other)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Inbox className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">მესიჯები</span>
                {unread > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={maximize}
                className="text-muted-foreground hover:text-foreground"
                aria-label="გადიდება"
                title="გადიდება"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={toggleOpen}
                className="text-muted-foreground hover:text-foreground"
                aria-label="დახურვა"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          {openedConvo ? (
            <>
              <div
                ref={msgsScrollRef}
                className="flex-1 space-y-2 overflow-y-auto p-3"
              >
                {loadingMsgs && (
                  <div className="flex justify-center pt-6 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
                {!loadingMsgs && messages.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    ჯერ მესიჯები არ არის
                  </p>
                )}
                {messages.map((m) => {
                  const isMe = m.sender_id === userIdRef.current;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-3 py-1.5 text-sm ${
                          isMe
                            ? "rounded-br-sm bg-primary text-primary-foreground"
                            : "rounded-bl-sm bg-secondary/60"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {m.body}
                        </p>
                        <p
                          className={`mt-0.5 text-[9px] ${
                            isMe
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          {timeShort(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form
                onSubmit={send}
                className="flex items-center gap-2 border-t border-border/60 p-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="დაწერე მესიჯი..."
                  className="h-8 bg-background/40 text-sm"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={!input.trim() || sending}
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {loadingList && conversations.length === 0 ? (
                <div className="flex justify-center pt-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="px-4 py-10 text-center text-xs text-muted-foreground">
                  მესიჯები არ გაქვს ჯერ
                </p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {conversations.map((c) => {
                    const name = nameFor(c.other);
                    const isMine =
                      c.lastMessage?.sender_id === userIdRef.current;
                    return (
                      <li key={c.id}>
                        <button
                          onClick={() => openConversation(c)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-secondary/40"
                        >
                          <Avatar className="h-9 w-9 shrink-0 border border-border/60">
                            <AvatarImage
                              src={c.other?.avatar_url ?? undefined}
                            />
                            <AvatarFallback className="bg-primary/15 text-xs text-primary">
                              {name.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-semibold">
                                {name}
                              </span>
                              {c.lastMessage && (
                                <span className="shrink-0 text-[9px] text-muted-foreground">
                                  {timeShort(c.lastMessage.created_at)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="truncate text-xs text-muted-foreground">
                                {isMine ? "შენ: " : ""}
                                {c.lastMessage?.body ?? "ცარიელი"}
                              </p>
                              {c.unread > 0 && (
                                <span className="ml-auto flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                                  {c.unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating bubble */}
      <button
        onClick={toggleOpen}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="მესიჯები"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}
