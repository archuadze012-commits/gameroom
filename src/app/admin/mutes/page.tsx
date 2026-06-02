"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { mockChatChannels } from "@/lib/mock-data";

type MutedRow = {
  id: string;
  channelId: string | null;
  reason: string | null;
  createdAt: string | null;
  expiresAt: string | null;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  mutedBy: {
    username: string;
    displayName: string | null;
  };
};

const CHANNEL_LABELS = Object.fromEntries(
  mockChatChannels.map((channel) => [channel.id, channel.name])
);

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ka-GE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatExpires(value: string | null) {
  if (!value) return "სამუდამო";
  return formatDate(value);
}

export default function AdminMutesPage() {
  const [items, setItems] = useState<MutedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unmutingId, setUnmutingId] = useState<string | null>(null);

  const load = useCallback(async (withSpinner = true) => {
    if (withSpinner) setLoading(true);
    try {
      const res = await fetch("/api/admin/mutes?status=active");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  const handleUnmute = async (id: string, label: string) => {
    setUnmutingId(id);
    try {
      const res = await fetch("/api/admin/mutes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("unmute_failed");
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success(`${label}-ს mute მოეხსნა`);
    } catch {
      toast.error("Unmute ვერ შესრულდა");
    } finally {
      setUnmutingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <VolumeX className="h-5 w-5 text-primary" />
            დამიუთებული იუზერები
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            აქტიური mute-ები ჩატებში
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> იტვირთება...
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              აქტიური mute-ები არ არის
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {items.map((item) => {
                const displayName = item.user.displayName ?? item.user.username;
                const channelLabel = item.channelId ? CHANNEL_LABELS[item.channelId] ?? item.channelId : "ყველა არხი";
                const mutedBy = item.mutedBy.displayName ?? item.mutedBy.username ?? "Moderator";

                return (
                  <div key={item.id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          username={item.user.username}
                          displayName={displayName}
                          avatarUrl={item.user.avatarUrl}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <Link href={`/profile/${item.user.username}`} className="truncate text-sm font-semibold hover:underline">
                            {displayName}
                          </Link>
                          <p className="text-xs text-muted-foreground">@{item.user.username}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{channelLabel}</Badge>
                        <Badge variant="outline" className="border-red-500/40 text-red-400">
                          {formatExpires(item.expiresAt)}
                        </Badge>
                        {item.reason && <Badge variant="outline">{item.reason}</Badge>}
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground">
                        <span>Muted by: {mutedBy}</span>
                        <span className="mx-2">·</span>
                        <span>დაწყება: {formatDate(item.createdAt)}</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="shrink-0"
                      disabled={unmutingId === item.id}
                      onClick={() => handleUnmute(item.id, displayName)}
                    >
                      {unmutingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unmute"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        სულ {items.length} აქტიური mute
      </p>
    </div>
  );
}
