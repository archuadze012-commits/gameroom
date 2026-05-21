"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Bell } from "lucide-react";

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
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        const unread = (data.notifications ?? []).filter(
          (n: Notification) => !n.read_at
        );
        setItems(unread.slice(0, 3));
      })
      .catch(() => {});
  }, []);

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
          <Link key={n.id} href={n.link}>
            {card}
          </Link>
        ) : (
          <div key={n.id}>{card}</div>
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
