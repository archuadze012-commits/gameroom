"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function MessagesLink() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setUnread(0);
          return;
        }
        const res = await fetch("/api/conversations");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const total = Array.isArray(data)
          ? data.reduce((sum: number, c: { unread: number }) => sum + (c.unread ?? 0), 0)
          : 0;
        setUnread(total);
      } catch {}
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link href="/messages" aria-label="Messages">
        <MessageSquare className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
    </Button>
  );
}
