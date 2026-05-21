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
          <div className="flex items-start gap-3 rounded-xl border border-[#1e2a44] bg-[#0f1626] px-4 py-3 transition-colors hover:border-cyan-400/30">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Users className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">{n.title}</p>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{n.body}</p>
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
        className="flex items-center justify-center gap-1 pt-0.5 text-xs text-primary hover:underline"
      >
        <Bell className="h-3 w-3" />
        ყველა შეტყობინება
      </Link>
    </div>
  );
}
