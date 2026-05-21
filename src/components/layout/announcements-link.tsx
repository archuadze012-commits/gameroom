"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AnnouncementsLink() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch("/api/announcements");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const readSet = new Set<string>(data.readIds ?? []);
        const count = (data.announcements ?? []).filter((a: { id: string }) => !readSet.has(a.id)).length;
        setUnread(count);
      } catch {}
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link href="/announcements" aria-label="უწყებები">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
    </Button>
  );
}
