"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Check, X, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Response = {
  id: string;
  message: string | null;
  status: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export function LfgJoinRequests({
  postId,
  initialResponses,
}: {
  postId: string;
  initialResponses: Response[];
}) {
  const [responses, setResponses] = useState<Response[]>(initialResponses);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function refresh() {
      const { data } = await supabase
        .from("lfg_responses")
        .select(
          "id, message, status, created_at, user_id, profiles!lfg_responses_user_id_fkey(username, display_name, avatar_url)"
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: false });
      if (data) setResponses(data as unknown as Response[]);
    }

    const channel = supabase
      .channel(`lfg_responses:${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lfg_responses",
          filter: `post_id=eq.${postId}`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <Users className="h-4 w-4 text-primary" />
        გუნდში შეერთების მოთხოვნები{" "}
        {responses.length > 0 && (
          <span className="text-sm text-muted-foreground">({responses.length})</span>
        )}
      </h3>

      {responses.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 py-6 text-center text-sm text-muted-foreground">
          ჯერ მოთხოვნა არ მოსულა.
        </p>
      ) : (
        <ul className="space-y-2">
          {responses.map((r) => {
            const username = r.profiles?.username ?? null;
            const name = r.profiles?.display_name ?? username ?? "მომხმარებელი";
            const ago = (() => {
              try {
                return formatDistanceToNow(new Date(r.created_at), {
                  addSuffix: true,
                  locale: ka,
                });
              } catch {
                return "";
              }
            })();
            return (
              <li
                key={r.id}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3"
              >
                <Avatar className="h-9 w-9 shrink-0 border border-border/60">
                  <AvatarImage src={r.profiles?.avatar_url ?? undefined} alt={name} />
                  <AvatarFallback className="bg-primary/15 text-xs text-primary">
                    {name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {username ? (
                      <Link
                        href={`/profile/${username}`}
                        className="font-semibold hover:text-primary"
                      >
                        {name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{name}</span>
                    )}
                    <span className="text-muted-foreground">· {ago}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.message && (
                    <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">
                      {r.message}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "accepted") {
    return (
      <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
        <Check className="mr-1 h-3 w-3" /> მიღებული
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="outline" className="border-destructive/40 text-destructive">
        <X className="mr-1 h-3 w-3" /> უარყოფილი
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-amber-500/40 text-amber-400">
      <Clock className="mr-1 h-3 w-3" /> მოლოდინში
    </Badge>
  );
}
