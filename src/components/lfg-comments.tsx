"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Loader2, Send, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export function LfgComments({
  postId,
  initialComments,
  hasSession,
}: {
  postId: string;
  initialComments: Comment[];
  hasSession: boolean;
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function refresh() {
      const { data } = await supabase
        .from("lfg_comments")
        .select(
          "id, body, created_at, user_id, profiles!lfg_comments_user_id_fkey(username, display_name, avatar_url)"
        )
        .eq("post_id", postId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (data) setComments(data as unknown as Comment[]);
    }

    const channel = supabase
      .channel(`lfg_comments:${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lfg_comments",
          filter: `post_id=eq.${postId}`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lfg/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error();
      setBody("");
      fetchedRef.current = false;
    } catch {
      toast.error("შეცდომა — სცადე თავიდან.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <MessageCircle className="h-4 w-4 text-primary" />
        კომენტარები {comments.length > 0 && <span className="text-sm text-muted-foreground">({comments.length})</span>}
      </h3>

      {hasSession ? (
        <form onSubmit={submit} className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="დაწერე კომენტარი matchmaking-ის შესახებ..."
            rows={3}
            maxLength={2000}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={submitting || !body.trim()}>
              {submitting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              გაგზავნა
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary hover:underline">
            შესვლა
          </Link>{" "}
          საჭიროა კომენტარის დასატოვებლად.
        </div>
      )}

      {comments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 py-6 text-center text-sm text-muted-foreground">
          ჯერ კომენტარები არ არის. გახდი პირველი!
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const username = c.profiles?.username ?? null;
            const name = c.profiles?.display_name ?? username ?? "მომხმარებელი";
            const ago = (() => {
              try {
                return formatDistanceToNow(new Date(c.created_at), {
                  addSuffix: true,
                  locale: ka,
                });
              } catch {
                return "";
              }
            })();
            return (
              <li
                key={c.id}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3"
              >
                <Avatar className="h-8 w-8 shrink-0 border border-border/60">
                  <AvatarImage src={c.profiles?.avatar_url ?? undefined} alt={name} />
                  <AvatarFallback className="bg-primary/15 text-xs text-primary">
                    {name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2 text-xs">
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
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{c.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
