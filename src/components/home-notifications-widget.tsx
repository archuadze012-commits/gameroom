"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Bell } from "lucide-react";
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
    const pollId = setInterval(load, 15_000);

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
      clearInterval(pollId);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function markRead(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  }

  if (items.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {items.map((n) => {
        const card = (
          <div
            className="relative isolate transition-all duration-300 group-hover:[--card-border-hover:rgba(220,38,38,0.8)] group"
            style={{ background: 'var(--card-border-hover, transparent)', padding: 1, clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)" }}
          >
            <div
              className="relative flex items-start gap-3 bg-[var(--gr-bg-1)] px-4 py-3"
              style={{ clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)" }}
            >
              {/* Hover Effects */}
              <div className="absolute inset-0 bg-gr-magenta opacity-0 transition-opacity group-hover:opacity-[0.04] z-[5] pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-br from-gr-magenta/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-[5] pointer-events-none" />
            <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-700 z-[5] pointer-events-none" />

            <span className="relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[var(--gr-violet)]/15 text-[var(--gr-violet-hi)] ring-1 ring-[var(--gr-violet)]/30">
              <Users className="h-3.5 w-3.5" />
            </span>
            <div className="relative z-10 min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-[var(--gr-text)] group-hover:text-[var(--gr-violet-hi)]">{n.title}</p>
              <p className="mt-0.5 line-clamp-1 text-[11.5px] text-[var(--gr-text-mute)]">{n.body}</p>
            </div>
          </div>
          </div>
        );
        return n.link ? (
          <Link key={n.id} href={n.link} onClick={() => markRead(n.id)}>
            {card}
          </Link>
        ) : (
          <div key={n.id} onClick={() => markRead(n.id)} className="cursor-pointer">{card}</div>
        );
      })}
      <Link
        href="/announcements"
        className="flex items-center justify-center gap-1 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--gr-violet-hi)] hover:text-[var(--gr-violet)]"
      >
        <Bell className="h-3 w-3" />
        ყველა შეტყობინება
      </Link>
    </div>
  );
}
