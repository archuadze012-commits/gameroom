"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { Heart, Send, Users, Rss, Newspaper, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { type FeedPost, type NewsWithGame } from "./page";

type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  favoriteGameSlugs: string[];
};

type Props = {
  currentUser: CurrentUser;
  initialPosts: FeedPost[];
  initialLikedIds: string[];
  news: NewsWithGame[];
  followingCount: number;
};

function timeAgo(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ka });
  } catch {
    return "";
  }
}

export function FeedClient({ currentUser, initialPosts, initialLikedIds, news, followingCount }: Props) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set(initialLikedIds));
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handlePost() {
    const content = draft.trim();
    if (!content) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error();
      const newPost: FeedPost = await res.json();
      setPosts((prev) => [newPost, ...prev]);
      setDraft("");
    } catch {
      toast.error("პოსტის გამოქვეყნება ვერ მოხერხდა");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleLike(postId: string) {
    const isLiked = likedIds.has(postId);
    setLikedIds((prev) => {
      const next = new Set(prev);
      isLiked ? next.delete(postId) : next.add(postId);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p
      )
    );
    try {
      await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    } catch {
      setLikedIds((prev) => {
        const next = new Set(prev);
        isLiked ? next.add(postId) : next.delete(postId);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likes_count: p.likes_count + (isLiked ? 1 : -1) } : p
        )
      );
    }
  }

  const isEmpty = posts.length === 0 && news.length === 0;

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Rss className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">ჩემი ლენტა</h1>
          <p className="text-xs text-muted-foreground">
            {followingCount > 0 ? `${followingCount} გამოწერილი გეიმერი` : "ჯერ არავინ გამოგიწერია"}
          </p>
        </div>
      </div>

      {/* composer */}
      <Card className="border-border/60">
        <CardContent className="flex gap-3 p-4">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={currentUser.avatarUrl} alt={currentUser.displayName} />
            <AvatarFallback className="bg-primary/15 text-primary text-xs">
              {(currentUser.displayName || currentUser.username).slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col gap-2">
            <Textarea
              ref={textareaRef}
              placeholder="გააზიარე ახალი ამბები, კლიპი ან მოსაზრება..."
              className="min-h-[80px] resize-none border-border/60 bg-secondary/30 text-sm"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handlePost(); }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{draft.length}/2000</span>
              <Button size="sm" disabled={!draft.trim() || submitting} onClick={handlePost}>
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {submitting ? "იგზავნება..." : "გამოქვეყნება"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* favorite games hint */}
      {currentUser.favoriteGameSlugs.length === 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          ფავორიტი თამაშები არ გაქვს მითითებული —{" "}
          <Link href="/settings" className="underline">პარამეტრებში</Link>{" "}
          დაამატე, რომ მხოლოდ შენი თამაშების სიახლეები გამოჩნდეს.
        </div>
      )}

      {/* empty state */}
      {isEmpty && followingCount === 0 && (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center text-sm text-muted-foreground">
            <Users className="h-10 w-10 opacity-30" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">ჯერ არავინ გამოგიწერია</p>
              <p>გამოიწერე სხვა გეიმერები — მათი პოსტები აქ გამოჩნდება</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/lfg">გეიმერების ძებნა <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* unified feed: posts first, then news */}
      <div className="space-y-4">
        {posts.map((post) => {
          const liked = likedIds.has(post.id);
          const author = post.profiles;
          return (
            <Card key={post.id} className="border-border/60">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <Link href={`/profile/${author.username}`}>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={author.avatar_url ?? ""} alt={author.display_name} />
                      <AvatarFallback className="bg-primary/15 text-primary text-xs">
                        {author.display_name.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <Link href={`/profile/${author.username}`} className="text-sm font-semibold hover:text-primary transition-colors">
                      {author.display_name || author.username}
                    </Link>
                    <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
                  </div>
                  <Badge variant="outline" className="ml-auto text-[10px] text-muted-foreground">
                    <Rss className="mr-1 h-2.5 w-2.5" /> პოსტი
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                <Separator className="border-border/40" />
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${liked ? "text-red-400" : "text-muted-foreground hover:text-red-400"}`}
                >
                  <Heart className={`h-4 w-4 ${liked ? "fill-red-400" : ""}`} />
                  {post.likes_count}
                </button>
              </CardContent>
            </Card>
          );
        })}

        {news.length > 0 && posts.length > 0 && (
          <div className="flex items-center gap-3 py-1">
            <Separator className="flex-1" />
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Newspaper className="h-3 w-3" /> სიახლეები
            </span>
            <Separator className="flex-1" />
          </div>
        )}

        {news.map((n) => (
          <Link key={n.slug} href={`/news/${n.slug}`}>
            <Card className="overflow-hidden border-border/60 transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5">
              <CardContent className="flex gap-4 p-4">
                <div className={`h-16 w-24 flex-shrink-0 rounded-md bg-gradient-to-br ${n.cover}`} />
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {n.game && (
                      <Badge variant="outline" className="text-[10px]">{n.game.nameKa}</Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] text-muted-foreground ml-auto">
                      <Newspaper className="mr-1 h-2.5 w-2.5" /> სიახლე
                    </Badge>
                  </div>
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{n.title}</h3>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{n.excerpt}</p>
                  <p className="text-[10px] text-muted-foreground/60">{n.publishedAt} · {n.readMinutes} წთ</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
