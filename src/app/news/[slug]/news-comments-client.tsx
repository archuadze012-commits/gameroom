"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ChevronButton } from "@/components/ui/chevron-button";
import { MessageCircle } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Card, CardContent } from "@/components/ui/card";

type CommentItem = {
  id: string;
  name: string;
  ago: string;
  body: string;
};

export function NewsCommentsClient({
  articleId,
  articleSlug,
  initialComments,
  currentUser,
}: {
  articleId: string;
  articleSlug: string;
  initialComments: CommentItem[];
  currentUser: any;
}) {
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const cutSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";

  async function handleSubmit() {
    if (!text.trim() || loading || !currentUser) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/news/${articleSlug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text.trim() }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [
          {
            id: newComment.id,
            name: currentUser.user_metadata?.username || currentUser.email?.split("@")[0] || "You",
            ago: "ახლახან",
            body: text.trim(),
          },
          ...prev,
        ]);
        setText("");
      } else {
        const err = await res.json();
        alert(err.error || "კომენტარის გამოქვეყნება ვერ მოხერხდა");
      }
    } catch (e) {
      console.error(e);
      alert("კავშირის შეცდომა");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-16">
      <div className="mb-5 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-[var(--gr-violet-hi)]" />
        <Eyebrow tone="violet">დისკუსია</Eyebrow>
        <span className="text-[12px] text-[var(--gr-text-mute)]">({comments.length})</span>
      </div>

      {/* compose */}
      {!currentUser ? (
        <Card className="mb-6 border-border/60">
          <CardContent className="p-5 text-center bg-[var(--gr-bg-1)]">
            <p className="text-sm text-[var(--gr-text-mute)]">
              კომენტარის დასაწერად <Link href="/auth/login" className="text-[var(--gr-violet-hi)] hover:underline">შედით სისტემაში</Link>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div
          className="relative mb-6 bg-[var(--gr-bg-1)] p-4 ring-1 ring-[var(--gr-border)]"
          style={{ clipPath: cutSm }}
        >
          <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
          <Textarea
            placeholder="დაწერე კომენტარი..."
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
            className="resize-none border-[var(--gr-border-hi)] bg-[var(--gr-bg-2)] text-[var(--gr-text)] placeholder:text-[var(--gr-text-dim)] focus-visible:ring-[var(--gr-violet-hi)]"
          />
          <div className="mt-3 flex justify-end">
            <ChevronButton
              variant="violet"
              size="sm"
              onClick={handleSubmit}
              disabled={!text.trim() || loading}
            >
              {loading ? "ქვეყნდება..." : "გამოქვეყნება"}
            </ChevronButton>
          </div>
        </div>
      )}

      {/* comments list */}
      <div className="space-y-3">
        {comments.map((c) => (
          <div
            key={c.id}
            className="relative bg-[var(--gr-bg-1)] p-4 ring-1 ring-[var(--gr-border)]"
            style={{ clipPath: cutSm }}
          >
            <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)] opacity-70" />
            <div className="flex items-start gap-3">
              <Avatar className="h-9 w-9 shrink-0 border border-[var(--gr-border-hi)]">
                <AvatarFallback className="bg-[var(--gr-violet)]/15 text-xs text-[var(--gr-violet-hi)]">
                  {c.name.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="font-semibold text-[var(--gr-text)]">@{c.name}</span>
                  <span className="text-[var(--gr-text-dim)]">· {c.ago}</span>
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--gr-text)]/90">{c.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
