"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/verified-badge";
import { toast } from "sonner";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified?: boolean;
  };
};

type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
};

type Props = {
  postId: string;
  initialComments: Comment[];
  currentUser: CurrentUser;
};

function timeAgo(iso: string) {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ka }); } catch { return ""; }
}

export function PostComments({ postId, initialComments, currentUser }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function submit() {
    const text = draft.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || "კომენტარის გამოქვეყნება ვერ მოხერხდა");
      }
      const newComment: Comment = await res.json();
      setComments((prev) => [...prev, newComment]);
      setDraft("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "კომენტარის გამოქვეყნება ვერ მოხერხდა");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <MessageSquare className="h-4 w-4" />
        კომენტარები
        {comments.length > 0 && <span className="text-xs font-normal">({comments.length})</span>}
      </div>

      {/* comment list */}
      {comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((c) => {
            const author = c.profiles;
            return (
              <div key={c.id} className="flex gap-3">
                <Link href={`/profile/${author.username}`} className="shrink-0">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={author.avatar_url ?? ""} alt={author.display_name} />
                    <AvatarFallback className="bg-primary/15 text-primary text-[10px]">
                      {author.display_name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 rounded-lg bg-secondary/30 px-3 py-2 text-sm">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <Link
                      href={`/profile/${author.username}`}
                      className="font-semibold hover:text-primary transition-colors"
                    >
                      {author.display_name || author.username}
                    </Link>
                    {author.is_verified && <VerifiedBadge className="h-3 w-3" />}
                    <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
                    {c.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* composer */}
      <div className="flex gap-3">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarImage src={currentUser.avatarUrl} alt={currentUser.displayName} />
          <AvatarFallback className="bg-primary/15 text-primary text-[10px]">
            {(currentUser.displayName || currentUser.username).slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-1 flex-col gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="დაწერე კომენტარი..."
            className="min-h-[60px] resize-none border-border/60 bg-secondary/30 text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(); }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{draft.length}/1000</span>
            <Button size="sm" disabled={!draft.trim() || submitting} onClick={submit}>
              {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
              {submitting ? "იგზავნება..." : "გამოქვეყნება"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
