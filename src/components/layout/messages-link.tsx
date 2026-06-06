"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavMessageCount } from "./use-nav-data";

export function MessagesLink() {
  const unread = useNavMessageCount();

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
