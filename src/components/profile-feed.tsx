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
import { GamerCard } from "@/components/ui/gamer-card";

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
        <GamerCard
          clipSize={16}
          className="border-0"
          surfaceClassName="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--gr-bg-1)_96%,black),color-mix(in_srgb,var(--gr-bg-2)_88%,black))]"
        >
          <div className="p-8 text-center text-sm text-[var(--gr-text-mute)]">
            პოსტები არ არის
          </div>
        </GamerCard>
      )}

      {posts.map((post) => {
        const liked = likedIds.has(post.id);
        const author = post.profiles;
        const authorName = author.display_name || author.username;
        return (
          <GamerCard
            key={post.id}
            clipSize={16}
            hover
            sideGlow={false}
            innerGlow="soft"
            className="border-0 transition-transform duration-200 hover:-translate-y-0.5"
            surfaceClassName="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--gr-bg-1)_96%,black),color-mix(in_srgb,var(--gr-bg-2)_88%,black))]"
          >
            <div className="relative space-y-3 p-4">
              <div className="flex items-center gap-3">
                <Link href={`/profile/${author.username}`} className="relative z-10">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={author.avatar_url ?? ""} alt={authorName} />
                    <AvatarFallback className="bg-[linear-gradient(135deg,var(--gr-magenta),var(--gr-cyan-glow))] text-white">
                      {authorName.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="min-w-0">
                  <Link
                    href={`/profile/${author.username}`}
                    className="relative z-10 flex items-center gap-1 text-sm font-semibold text-[var(--gr-text)] transition-colors hover:text-[var(--gr-cyan-glow)]"
                  >
                    <span className="truncate">{authorName}</span>
                    {author.is_verified && <VerifiedBadge className="h-3.5 w-3.5 shrink-0" />}
                  </Link>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--gr-text-dim)]">{timeAgo(post.created_at)}</p>
                </div>
                <Link
                  href={`/profile/${author.username}/${post.id}`}
                  className="relative z-10 ml-auto text-[10px] font-black uppercase tracking-[0.16em] text-[var(--gr-text-dim)] transition-colors hover:text-[var(--gr-cyan-glow)]"
                >
                  გახსნა
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

              <Separator className="bg-[var(--gr-border)]" />

              <div className="relative z-10 flex items-center gap-4">
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
                    liked ? "text-[var(--gr-magenta)]" : "text-[var(--gr-text-dim)] hover:text-[var(--gr-magenta)]"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${liked ? "fill-[var(--gr-magenta)]" : ""}`} />
                  {post.likes_count}
                </button>
                <Link
                  href={`/profile/${author.username}/${post.id}`}
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--gr-text-dim)] transition-colors hover:text-[var(--gr-cyan-glow)]"
                >
                  <MessageCircle className="h-4 w-4" />
                  {post.comments_count}
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
          </GamerCard>
        );
      })}
    </div>
  );
}
