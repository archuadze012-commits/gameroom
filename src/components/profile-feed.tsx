"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { Heart, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { VerifiedBadge } from "@/components/verified-badge";
import { PostContent } from "@/components/post-content";
import { ReportButton } from "@/components/report-button";
import { PostComposer, type PostComposerUser } from "@/components/post-composer";
import { PostOwnerActions } from "@/components/post-owner-actions";

export type ProfileFeedPost = {
  id: string;
  content: string;
  media_urls?: string[] | null;
  likes_count: number;
  created_at: string;
  comments_count: number;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified?: boolean;
    role?: string | null;
  };
  author_id?: string;
};

type Props = {
  currentUser?: PostComposerUser;
  initialPosts: ProfileFeedPost[];
  initialLikedIds?: string[];
  isOwner?: boolean;
  canDeletePosts?: boolean;
};

function timeAgo(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ka });
  } catch {
    return "";
  }
}

export function ProfileFeed({
  currentUser,
  initialPosts,
  initialLikedIds = [],
  isOwner = false,
  canDeletePosts = false,
}: Props) {
  const [posts, setPosts] = useState<ProfileFeedPost[]>(initialPosts);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set(initialLikedIds));
  function toggleLike(id: string) {
    const willLike = !likedIds.has(id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (willLike) next.add(id);
      else next.delete(id);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, likes_count: p.likes_count + (willLike ? 1 : -1) } : p
      )
    );

    fetch(`/api/posts/${id}/like`, { method: "POST" }).catch(() => {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (willLike) next.delete(id);
        else next.add(id);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, likes_count: p.likes_count + (willLike ? -1 : 1) } : p
        )
      );
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[var(--gr-cyan-glow)] shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
        <h2 className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--gr-cyan-glow)]">პოსტების ფიდი</h2>
      </div>

      {isOwner && currentUser && (
        <PostComposer
          currentUser={currentUser}
          revalidatePath={`/profile/${currentUser.username}`}
          onPostCreated={(post) => {
            setPosts((prev) => [{ ...post, comments_count: 0 }, ...prev]);
          }}
        />
      )}

      {posts.length === 0 && (
        <div className="pubg-loadout-link block" data-variant="strike">
          <div className="pubg-loadout-card relative overflow-hidden px-8 py-10 text-center text-sm text-[var(--gr-text-mute)]">
            <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
            <div className="relative z-[1]">
              პოსტები არ არის
            </div>
          </div>
        </div>
      )}

      {posts.map((post) => {
        const liked = likedIds.has(post.id);
        const author = post.profiles;
        const authorName = author.display_name || author.username;
        return (
          <div key={post.id} className="pubg-loadout-link group block" data-variant="strike">
            <div className="pubg-loadout-card relative overflow-hidden p-5 sm:p-6">
              <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
              <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5]" />
              <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-25 z-[5]" />
              <div className="relative z-[1] space-y-4">
              <div className="flex items-center gap-3">
                <Link href={`/profile/${author.username}`} className="relative z-10">
                  <Avatar className="h-10 w-10 border border-white/10 shadow-[0_0_18px_rgba(0,230,255,0.12)]">
                    <AvatarImage src={author.avatar_url ?? ""} alt={authorName} />
                    <AvatarFallback className="bg-[linear-gradient(135deg,var(--gr-magenta),var(--gr-cyan-glow))] text-white">
                      {authorName.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="min-w-0">
                  <Link
                    href={`/profile/${author.username}`}
                    className="relative z-10 flex items-center gap-1 font-display text-[15px] font-black uppercase tracking-[0.04em] text-[#D0F8FF] drop-shadow-[0_0_8px_rgba(0,230,255,0.45)] transition-colors hover:text-white"
                  >
                    <span className="truncate">{authorName}</span>
                    {author.is_verified && <VerifiedBadge className="h-3.5 w-3.5 shrink-0" />}
                  </Link>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D0F8FF]/70">{timeAgo(post.created_at)}</p>
                </div>
                <Link
                  href={`/profile/${author.username}/${post.id}`}
                  className="pubg-loadout-card relative z-10 ml-auto flex items-center overflow-hidden px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#D0F8FF] transition-colors hover:text-white"
                >
                  <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                  <span className="relative z-[1]">გახსნა</span>
                </Link>
              </div>

              <div className="relative z-10">
                <PostContent
                  content={post.content}
                  mediaUrls={post.media_urls}
                  authorRole={author.role}
                  authorVerified={author.is_verified}
                />
              </div>

              <Separator className="bg-white/10" />

              <div className="relative z-10 flex flex-wrap items-center gap-x-4 gap-y-3">
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`pubg-loadout-card relative flex items-center gap-1.5 overflow-hidden px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] transition-colors ${
                    liked ? "text-[var(--gr-magenta)]" : "text-[var(--gr-text-dim)] hover:text-[var(--gr-magenta)]"
                  }`}
                >
                  <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                  <span className="relative z-[1] flex items-center gap-1.5">
                  <Heart className={`h-4 w-4 ${liked ? "fill-[var(--gr-magenta)]" : ""}`} />
                  {post.likes_count}
                  </span>
                </button>
                <Link
                  href={`/profile/${author.username}/${post.id}`}
                  className="pubg-loadout-card relative flex items-center gap-1.5 overflow-hidden px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--gr-text-dim)] transition-colors hover:text-[#D0F8FF]"
                >
                  <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                  <span className="relative z-[1] flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" />
                    {post.comments_count}
                  </span>
                </Link>
                <div className="ml-auto">
                  <div className="flex items-center gap-2">
                    <PostOwnerActions
                      postId={post.id}
                      canEdit={isOwner}
                      canDelete={canDeletePosts}
                      editHref={isOwner ? `/profile/${author.username}/${post.id}/edit` : undefined}
                      onDeleted={() => setPosts((prev) => prev.filter((item) => item.id !== post.id))}
                    />
                    <ReportButton targetType="post" targetId={post.id} />
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
