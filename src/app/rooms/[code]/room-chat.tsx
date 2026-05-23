"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Msg = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

type Props = {
  roomId: string;
  currentUserId: string | null;
};

function timeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" });
}

export function RoomChat({ roomId, currentUserId }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load existing messages
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("room_chat_messages")
        .select(
          "id, user_id, body, created_at, profiles!room_chat_messages_user_id_fkey(username, display_name, avatar_url)"
        )
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!cancelled) {
        setMessages((data ?? []) as unknown as Msg[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [roomId]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`room-chat:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const row = payload.new as { id: string; user_id: string };
          // skip if it's our own message (we already added it optimistically)
          if (row.user_id === currentUserId) return;
          // fetch with profile join
          const { data } = await supabase
            .from("room_chat_messages")
            .select(
              "id, user_id, body, created_at, profiles!room_chat_messages_user_id_fkey(username, display_name, avatar_url)"
            )
            .eq("id", row.id)
            .maybeSingle();
          if (data) {
            setMessages((prev) =>
              prev.some((m) => m.id === data.id) ? prev : [...prev, data as unknown as Msg]
            );
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUserId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      toast.error("შესვლა გჭირდება");
      return;
    }
    const body = input.trim();
    if (!body) return;
    if (body.length > 500) {
      toast.error("მესიჯი ძალიან გრძელია");
      return;
    }
    setSending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("room_chat_messages")
        .insert({ room_id: roomId, user_id: currentUserId, body })
        .select(
          "id, user_id, body, created_at, profiles!room_chat_messages_user_id_fkey(username, display_name, avatar_url)"
        )
        .single();
      if (error) throw error;
      if (data) {
        setMessages((prev) => [...prev, data as unknown as Msg]);
      }
      setInput("");
    } catch (err) {
      console.error(err);
      toast.error("მესიჯი ვერ გაიგზავნა");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[60vh] min-h-[400px] flex-col overflow-hidden bg-[var(--gr-bg-1)] ring-1 ring-[var(--gr-border)]">
      {/* messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[12px] text-[var(--gr-text-dim)]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> იტვირთება...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-[12px] text-[var(--gr-text-dim)]">
            ჯერ მესიჯი არ არის. იყავი პირველი!
          </div>
        ) : (
          messages.map((m) => {
            const profile = m.profiles;
            const name = profile?.display_name ?? profile?.username ?? "მომხმარებელი";
            const initial = name.slice(0, 1).toUpperCase();
            const isMine = m.user_id === currentUserId;
            return (
              <div key={m.id} className={`flex items-start gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                <Link
                  href={profile?.username ? `/profile/${profile.username}` : "#"}
                  className="shrink-0"
                >
                  <Avatar className="h-7 w-7 border border-[var(--gr-border-hi)]">
                    <AvatarImage src={profile?.avatar_url ?? undefined} alt={name} />
                    <AvatarFallback className="bg-[var(--gr-violet)]/15 text-[10px] text-[var(--gr-violet-hi)]">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className={`max-w-[75%] ${isMine ? "items-end" : ""} flex flex-col`}>
                  <div className={`flex items-center gap-2 text-[10px] ${isMine ? "flex-row-reverse" : ""}`}>
                    <span className="font-semibold text-[var(--gr-text-mute)]">{name}</span>
                    <span className="text-[var(--gr-text-dim)]">{timeOnly(m.created_at)}</span>
                  </div>
                  <div
                    className={`mt-1 inline-block whitespace-pre-wrap break-words px-3 py-2 text-[13px] leading-snug ${
                      isMine
                        ? "bg-[var(--gr-violet)]/25 text-white ring-1 ring-[var(--gr-violet)]/40"
                        : "bg-[var(--gr-bg-2)] text-white/95 ring-1 ring-[var(--gr-border)]"
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* input */}
      {currentUserId ? (
        <form onSubmit={send} className="flex items-center gap-2 border-t border-[var(--gr-border)] bg-[var(--gr-bg-2)] p-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
            placeholder="დაწერე..."
            disabled={sending}
            className="flex-1 bg-[var(--gr-bg-1)] px-3 py-2 text-[13px] text-white outline-none ring-1 ring-[var(--gr-border)] focus:ring-[var(--gr-violet-hi)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[var(--gr-violet)] to-[var(--gr-magenta)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.14em] text-white disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </form>
      ) : (
        <div className="border-t border-[var(--gr-border)] bg-[var(--gr-bg-2)] p-3 text-center text-[12px] text-[var(--gr-text-dim)]">
          <Link href="/auth/login" className="text-[var(--gr-violet-hi)] hover:underline">
            შედი ანგარიშში
          </Link>{" "}
          ჩატში გასაგზავნად
        </div>
      )}
    </div>
  );
}
