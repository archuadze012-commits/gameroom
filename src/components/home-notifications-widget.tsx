"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Bell, ChevronRight } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
};

export function HomeNotificationsWidget() {
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const unread = (data.notifications ?? []).filter(
          (n: Notification) => !n.read_at
        );
        setItems(unread.slice(0, 3));
      } catch {}
    }

    load();

    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => load()
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function markRead(id: string) {
    const removed = items.find((n) => n.id === id);
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      if (!res.ok) throw new Error("failed");
    } catch {
      // Restore on failure so the item isn't silently lost while still unread.
      if (removed) setItems((prev) => (prev.some((n) => n.id === id) ? prev : [removed, ...prev]));
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map((n) => {
        const card = (
          <div className="group neon-frame rounded-[16px]">
            <div className="relative h-full w-full overflow-hidden rounded-[13px] bg-[#0a0714] p-3 flex items-start gap-3">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              
              <span className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                <Users className="h-4 w-4" />
              </span>
              <div className="relative z-10 min-w-0 flex-1">
                <p className="text-[13px] font-bold text-white transition-colors group-hover:text-cyan-400 drop-shadow-sm">{n.title}</p>
                <p className="mt-1 line-clamp-2 text-[12px] text-white/60 leading-relaxed">{n.body}</p>
              </div>
            </div>
          </div>
        );
        return n.link ? (
          <Link key={n.id} href={n.link} onClick={() => markRead(n.id)} className="block">
            {card}
          </Link>
        ) : (
          <div key={n.id} onClick={() => markRead(n.id)} className="cursor-pointer">{card}</div>
        );
      })}
      <Link
        href="/announcements"
        className="group mt-4 flex items-center justify-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-cyan-400 transition-all hover:bg-cyan-500/10 hover:shadow-[0_0_10px_rgba(34,211,238,0.2)]"
      >
        <Bell className="h-3 w-3" />
        ყველა შეტყობინება
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
