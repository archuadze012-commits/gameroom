"use client";

import { useState } from "react";
import { Heart, MessageCircle, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { type MockFeedPost } from "@/lib/mock-data";

type Props = {
  username: string;
  displayName: string;
  initialPosts: MockFeedPost[];
  isOwner?: boolean;
};

export function ProfileFeed({ username, displayName, initialPosts, isOwner = false }: Props) {
  const [posts, setPosts] = useState<MockFeedPost[]>(initialPosts);
  const [draft, setDraft] = useState("");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  function handlePost() {
    const text = draft.trim();
    if (!text) return;
    const newPost: MockFeedPost = {
      id: `fp-${Date.now()}`,
      authorName: username,
      authorDisplay: displayName,
      content: text,
      createdAgo: "ახლახანს",
      likes: 0,
      comments: 0,
    };
    setPosts((prev) => [newPost, ...prev]);
    setDraft("");
  }

  function toggleLike(id: string) {
    // Snapshot the intended direction once so the count and the liked-set stay
    // in sync (don't read the stale `likedIds` closure inside the updater).
    const willLike = !likedIds.has(id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (willLike) next.add(id);
      else next.delete(id);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, likes: p.likes + (willLike ? 1 : -1) } : p
      )
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Feed</h2>

      {isOwner && (
        <Card className="border-border/60">
          <CardContent className="flex gap-3 p-4">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src="/default-avatar.svg" alt={displayName} />
              <AvatarFallback className="bg-primary/15 text-primary">
                {displayName.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col gap-2">
              <Textarea
                placeholder="გააზიარე ახალი ამბები, კლიპი ან მოსაზრება..."
                className="min-h-[80px] resize-none border-border/60 bg-secondary/30 text-sm"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handlePost();
                }}
              />
              <div className="flex justify-end">
                <Button size="sm" disabled={!draft.trim()} onClick={handlePost}>
                  <Send className="mr-1.5 h-3.5 w-3.5" /> გამოქვეყნება
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {posts.length === 0 && (
        <Card className="border-dashed border-border/60">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            პოსტები არ არის
          </CardContent>
        </Card>
      )}

      {posts.map((post) => {
        const liked = likedIds.has(post.id);
        return (
          <Card key={post.id} className="border-border/60">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/default-avatar.svg" alt={post.authorDisplay} />
                  <AvatarFallback className="bg-primary/15 text-primary">
                    {post.authorDisplay.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{post.authorDisplay}</p>
                  <p className="text-xs text-muted-foreground">{post.createdAgo}</p>
                </div>
              </div>

              <p className="text-sm leading-relaxed">{post.content}</p>

              <Separator className="border-border/40" />

              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${
                    liked ? "text-red-400" : "text-muted-foreground hover:text-red-400"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${liked ? "fill-red-400" : ""}`} />
                  {post.likes}
                </button>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <MessageCircle className="h-4 w-4" />
                  {post.comments}
                </button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
