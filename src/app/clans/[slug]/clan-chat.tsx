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

const SELECT = "id, user_id, body, created_at, profiles!clan_messages_user_id_fkey(username, display_name, avatar_url)";

function timeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" });
}

// Private, member-only clan chat. Reads/writes go through clan_messages, which
// is RLS-gated to clan members; realtime respects that RLS per subscriber, so
// only members receive events. Mirrors the room-chat pattern.
export function ClanChat({
  clanId,
  clanSlug,
  currentUserId,
}: {
  clanId: string;
  clanSlug: string;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("clan_messages")
        .select(SELECT)
        .eq("clan_id", clanId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!cancelled) {
        setMessages(((data ?? []) as unknown as Msg[]).slice().reverse());
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clanId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`clan-chat:${clanId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "clan_messages", filter: `clan_id=eq.${clanId}` },
        async (payload) => {
          const row = payload.new as { id: string; user_id: string };
          if (row.user_id === currentUserId) return; // already added optimistically
          const { data } = await supabase.from("clan_messages").select(SELECT).eq("id", row.id).maybeSingle();
          if (data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;
              const next = [...prev, data as unknown as Msg];
              return next.length > 200 ? next.slice(-200) : next;
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clanId, currentUserId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = input.trim();
    if (!body) return;
    if (body.length > 500) { toast.error("მესიჯი ძალიან გრძელია"); return; }
    setSending(true);
    try {
      const res = await fetch(`/api/clans/${clanSlug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 400 && data?.error === "content_blocked") toast.error(data.reason || "მესიჯი დაბლოკილია");
        else if (res.status === 429) toast.error("ძალიან ხშირად წერ — დაელოდე წამით");
        else if (res.status === 403) toast.error("კლანის წევრი არ ხარ");
        else toast.error("მესიჯი ვერ გაიგზავნა");
        return;
      }
      if (data) {
        setMessages((prev) => {
          const next = [...prev, data as unknown as Msg];
          return next.length > 200 ? next.slice(-200) : next;
        });
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
    <div className="pubg-loadout-link block" data-variant="room">
      <div className="pubg-loadout-card relative overflow-hidden">
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-cyan-500/70" />
        <div className="relative z-10 flex h-[52vh] min-h-[360px] flex-col">
          {/* messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="flex h-full items-center justify-center text-[12px] text-white/40">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> იტვირთება...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-[12px] text-white/40">
                ჯერ მესიჯი არ არის. იყავი პირველი! 👋
              </div>
            ) : (
              messages.map((m) => {
                const profile = m.profiles;
                const name = profile?.display_name ?? profile?.username ?? "მომხმარებელი";
                const initial = name.slice(0, 1).toUpperCase();
                const isMine = m.user_id === currentUserId;
                return (
                  <div key={m.id} className={`flex items-start gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                    <Link href={profile?.username ? `/profile/${profile.username}` : "#"} className="shrink-0">
                      <Avatar className="h-7 w-7 border border-white/10">
                        <AvatarImage src={profile?.avatar_url ?? undefined} alt={name} />
                        <AvatarFallback className="bg-indigo-500/15 text-[10px] text-indigo-300">{initial}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className={`flex max-w-[75%] flex-col ${isMine ? "items-end" : ""}`}>
                      <div className={`flex items-center gap-2 text-[10px] ${isMine ? "flex-row-reverse" : ""}`}>
                        <span className="font-bold text-white/60">{name}</span>
                        <span className="text-white/30">{timeOnly(m.created_at)}</span>
                      </div>
                      <div
                        className={`mt-1 inline-block whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-[13px] leading-snug ${
                          isMine
                            ? "bg-indigo-500/25 text-white ring-1 ring-indigo-500/40"
                            : "bg-white/[0.04] text-white/95 ring-1 ring-white/10"
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

          {/* composer */}
          <form onSubmit={send} className="flex items-center gap-2 border-t border-white/10 bg-black/20 p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="მესიჯის ტექსტი"
              maxLength={500}
              placeholder="დაწერე კლანს..."
              disabled={sending}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] text-white outline-none focus:border-indigo-500/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-[var(--gr-magenta)] px-4 py-2.5 text-[12px] font-black uppercase tracking-wider text-white disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
