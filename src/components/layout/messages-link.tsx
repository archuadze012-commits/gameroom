"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Loader2, MessageSquare } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavMessageCount } from "./use-nav-data";

type ConversationPreview = {
  id: string;
  other: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  lastMessage: { body: string; created_at: string | null; sender_id: string } | null;
  unread: number;
};

export function MessagesLink() {
  const unread = useNavMessageCount();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadConversations = async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/conversations", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setConversations(Array.isArray(data) ? data.slice(0, 6) : []);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) void loadConversations(); }}>
      <DropdownMenuTrigger
        aria-label="მესენჯერი"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-white/75 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
      >
        <MessageSquare className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="pubg-loadout-card w-[380px] overflow-hidden !rounded-xl !p-0 border border-white/5 bg-[rgba(8,6,15,0.97)] text-white shadow-2xl backdrop-blur-xl"
      >
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-[#00d0ff] shadow-[0_0_10px_rgba(0,208,255,0.8)]" />
        <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-25 z-[5]" />

        <div className="relative z-10 flex flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-cyan-300" />
              <span className="text-sm font-bold">მესენჯერი</span>
              {unread > 0 && <span className="rounded-full bg-cyan-300/15 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">{unread}</span>}
            </div>
            <Link href="/messages" className="text-[11px] font-semibold text-cyan-300 transition-colors hover:text-cyan-100">
              ყველა ჩატი
            </Link>
          </div>

          <div className="max-h-[390px] overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center px-4 py-10">
                <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
              </div>
            ) : conversations.length > 0 ? (
              conversations.map((conversation) => {
                const name = conversation.other?.display_name ?? conversation.other?.username ?? "მოთამაშე";
                const isUnread = conversation.unread > 0;
                return (
                  <Link
                    key={conversation.id}
                    href={`/messages/${conversation.id}`}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-white/[0.06] ${isUnread ? "bg-cyan-300/[0.06]" : ""}`}
                  >
                    <UserAvatar
                      username={conversation.other?.username ?? "user"}
                      displayName={name}
                      avatarUrl={conversation.other?.avatar_url}
                      size="sm"
                      className="border-cyan-300/25"
                    />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[13px] ${isUnread ? "font-semibold text-white" : "font-medium text-white/75"}`}>{name}</span>
                      <span className="mt-1 block truncate text-[12px] text-white/50">{conversation.lastMessage?.body ?? "ცარიელი მიმოწერა"}</span>
                    </span>
                    {isUnread ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-300 px-1.5 text-[10px] font-black text-slate-950">{conversation.unread}</span> : null}
                  </Link>
                );
              })
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-white/50">
                <MessageSquare className="h-5 w-5 text-cyan-300/75" />
                <span className="text-sm">მიმოწერები ჯერ არ გაქვს</span>
              </div>
            )}
          </div>

          <Link
            href="/messages"
            className="flex w-full items-center justify-center gap-2 border-t border-white/10 px-4 py-3 text-[11px] font-bold text-cyan-300 transition-colors hover:bg-cyan-400/[0.08] hover:text-cyan-100"
          >
            ყველა მიმოწერის გახსნა <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
